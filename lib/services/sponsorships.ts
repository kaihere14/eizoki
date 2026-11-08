import { cacheLife, cacheTag } from "next/cache";
import { ApiError } from "@/lib/api-error";
import type { Prisma, SponsorshipStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SPONSOR_CAPACITY,
  SPONSORSHIP_LABELS,
  sponsorshipEndsAt,
  withSponsorUtm,
  type PublicFeedSponsor,
  type PublicSponsor,
  type SponsorshipPlacement,
} from "@/lib/sponsorships";
import { playableVideoUrl } from "@/lib/video-delivery";
import { requireUser } from "./current-user";
import {
  fetchWebsiteIcon,
  inlineSponsorIcon,
  normaliseSponsorIcon,
} from "./sponsor-icons";
import {
  cleanupUploadedVideo,
  uploadFileToImageKit,
  uploadVideoToImageKit,
  type UploadedAsset,
} from "./imagekit";
import {
  parseSponsorshipFields,
  peakConcurrency,
  validateSponsorIcon,
} from "./sponsorship-validation";
import { readSubmissionForm, validateVideoFile } from "./video-validation";

/** Invalidate after any review decision so the navbar and feed update. */
export const SPONSORSHIP_CACHE_TAG = "sponsorships";

/** Stops one account from parking many uploads in the review queue. */
const MAX_OPEN_BOOKINGS_PER_USER = 3;

const MIN_REVALIDATE_SECONDS = 60;
const MAX_REVALIDATE_SECONDS = 60 * 60;

type PublicRow = {
  id: string;
  productName: string;
  websiteUrl: string;
  iconUrl: string | null;
  description: string | null;
  videoUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Icons are inlined here, inside the cached read, so they ship with the HTML. */
async function toPublicSponsor(row: PublicRow): Promise<PublicSponsor> {
  return {
    id: row.id,
    productName: row.productName,
    href: withSponsorUtm(row.websiteUrl),
    iconUrl: await inlineSponsorIcon(row.iconUrl),
    description: row.description,
  };
}

const SPONSOR_IMAGE_FOLDER = "/eizoki/sponsors/images";

/**
 * Every sponsor gets an ImageKit icon: the custom upload when given, otherwise
 * the website's own icon fetched server-side. Both are normalised to a small
 * square WebP. Returns null only when the site has no usable icon.
 */
export async function uploadSponsorIcon(
  websiteUrl: string,
  custom: File | null,
) {
  const webp = custom
    ? await normaliseSponsorIcon(Buffer.from(await custom.arrayBuffer())).catch(
        () => {
          throw new ApiError(415, "The icon image could not be read.");
        },
      )
    : await fetchWebsiteIcon(websiteUrl);
  if (!webp) return null;
  return uploadFileToImageKit(
    new File([new Uint8Array(webp)], "icon.webp", { type: "image/webp" }),
    "webp",
    SPONSOR_IMAGE_FOLDER,
    "image",
  );
}

/**
 * Seconds until the live set next changes (a booking ends or a scheduled one
 * starts), so the cache refreshes on that boundary instead of a fixed timer.
 */
function secondsUntilNextChange(rows: PublicRow[], now: Date) {
  const boundaries = rows
    .flatMap((row) => [row.startsAt, row.endsAt])
    .filter((date): date is Date => date !== null && date > now)
    .map((date) => Math.ceil((date.getTime() - now.getTime()) / 1000));
  const next = Math.min(MAX_REVALIDATE_SECONDS, ...boundaries);
  return Math.max(MIN_REVALIDATE_SECONDS, next);
}

/** Log enough to diagnose a failed read without leaking query details. */
function logReadFailure(message: string, error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? ` ${String(error.code)}`
      : "";
  console.error(`${message} (${name}${code})`);
}

async function readLiveSponsors(placement: SponsorshipPlacement) {
  const now = new Date();
  const rows = await prisma.sponsorship.findMany({
    where: { placement, status: "APPROVED", endsAt: { gt: now } },
    orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    // Live rows plus enough scheduled ones to know when the set next changes.
    take: SPONSOR_CAPACITY[placement] * 4,
    select: {
      id: true,
      productName: true,
      websiteUrl: true,
      iconUrl: true,
      description: true,
      videoUrl: true,
      startsAt: true,
      endsAt: true,
      sortOrder: true,
    },
  });
  const live = rows
    .filter((row) => row.startsAt !== null && row.startsAt <= now)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, SPONSOR_CAPACITY[placement]);
  return { live, revalidate: secondsUntilNextChange(rows, now) };
}

/** Live navbar sponsors, at most SPONSOR_CAPACITY.NAVBAR. */
export async function getLiveNavbarSponsors(): Promise<PublicSponsor[]> {
  "use cache";
  cacheTag(SPONSORSHIP_CACHE_TAG);
  try {
    const { live, revalidate } = await readLiveSponsors("NAVBAR");
    cacheLife({ stale: 60, revalidate, expire: 60 * 60 * 24 });
    return await Promise.all(live.map(toPublicSponsor));
  } catch (error) {
    // Sponsors are optional chrome: never break the page, and retry soon.
    logReadFailure("Navbar sponsors could not be loaded", error);
    cacheLife("seconds");
    return [];
  }
}

/** The live sponsored feed video, if one is booked right now. */
export async function getLiveFeedSponsor(): Promise<PublicFeedSponsor | null> {
  "use cache";
  cacheTag(SPONSORSHIP_CACHE_TAG);
  try {
    const { live, revalidate } = await readLiveSponsors("FEED_VIDEO");
    cacheLife({ stale: 60, revalidate, expire: 60 * 60 * 24 });
    const row = live[0];
    return row?.videoUrl
      ? {
          ...(await toPublicSponsor(row)),
          videoUrl: playableVideoUrl(row.videoUrl),
        }
      : null;
  } catch (error) {
    logReadFailure("Feed sponsor could not be loaded", error);
    cacheLife("seconds");
    return null;
  }
}

/**
 * Self-serve booking. Payment does not exist yet, so a booking goes straight
 * to review; checkout will insert PENDING_PAYMENT in front of this step.
 * An admin's booking skips review and goes live now for one month, the same
 * way admin video submissions publish immediately.
 */
export async function createSponsorshipBooking(request: Request) {
  const user = await requireUser("Sign in to book a sponsorship.");
  const open = user.isAdmin
    ? 0
    : await prisma.sponsorship.count({
    where: {
      bookedById: user.id,
      status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW"] },
    },
  });
  if (open >= MAX_OPEN_BOOKINGS_PER_USER) {
    throw new ApiError(
      429,
      "You already have bookings waiting for review. We will be in touch soon.",
    );
  }

  const form = await readSubmissionForm(request);
  const booking = parseSponsorshipFields(form);
  const icon = await validateSponsorIcon(form.get("icon"));
  const video =
    booking.placement === "FEED_VIDEO"
      ? await validateVideoFile(form.get("video"))
      : null;
  if (booking.placement === "NAVBAR" && form.has("video")) {
    throw new ApiError(400, "Navbar sponsorships do not include a video.");
  }

  const startsAt = new Date();
  const schedule = { startsAt, endsAt: sponsorshipEndsAt(startsAt) };
  // Fail before uploading anything when an admin publish has no free slot.
  if (user.isAdmin) await assertSlotFree(prisma, booking.placement, schedule);

  const uploaded: UploadedAsset[] = [];
  try {
    const iconAsset = await uploadSponsorIcon(
      booking.websiteUrl,
      icon?.file ?? null,
    );
    if (iconAsset) uploaded.push(iconAsset);
    const videoAsset = video
      ? await uploadVideoToImageKit(
          video.file,
          video.extension,
          "/eizoki/sponsors/videos",
        )
      : null;
    if (videoAsset) uploaded.push(videoAsset);

    const data = {
      ...booking,
      bookedById: user.id,
      iconUrl: iconAsset?.url,
      iconImagekitFileId: iconAsset?.fileId,
      videoUrl: videoAsset?.url,
      videoImagekitFileId: videoAsset?.fileId,
      durationSeconds: videoAsset?.duration,
    };
    const select = {
      id: true,
      placement: true,
      status: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    } as const;
    if (!user.isAdmin) return await prisma.sponsorship.create({ data, select });

    return await prisma.$transaction(
      async (tx) => {
        // Re-check inside the transaction; the uploads took time.
        await assertSlotFree(tx, booking.placement, schedule);
        return tx.sponsorship.create({
          data: {
            ...data,
            ...schedule,
            status: "APPROVED",
            reviewedById: user.id,
            reviewedAt: startsAt,
          },
          select,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    await Promise.all(
      uploaded.map((asset) => cleanupUploadedVideo(asset.fileId)),
    );
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Admin review                                                         */
/* ------------------------------------------------------------------ */

/** Throw 409 when the window would exceed the placement's live capacity. */
async function assertSlotFree(
  db: Prisma.TransactionClient,
  placement: SponsorshipPlacement,
  window: { startsAt: Date; endsAt: Date },
  excludeId?: string,
) {
  const others = await db.sponsorship.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      placement,
      status: "APPROVED",
      startsAt: { lt: window.endsAt },
      endsAt: { gt: window.startsAt },
    },
    select: { startsAt: true, endsAt: true },
  });
  const booked = peakConcurrency(
    window,
    others.flatMap((other) =>
      other.startsAt && other.endsAt
        ? [{ startsAt: other.startsAt, endsAt: other.endsAt }]
        : [],
    ),
  );
  if (booked >= SPONSOR_CAPACITY[placement]) {
    throw new ApiError(
      409,
      `All ${SPONSOR_CAPACITY[placement]} ${SPONSORSHIP_LABELS[placement].toLowerCase()} slots are taken for part of that month. Choose a later start date.`,
    );
  }
}

export async function listSponsorshipsForAdmin() {
  const rows = await prisma.sponsorship.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      placement: true,
      status: true,
      productName: true,
      websiteUrl: true,
      description: true,
      contactEmail: true,
      iconUrl: true,
      videoUrl: true,
      startsAt: true,
      endsAt: true,
      reviewNotes: true,
      reviewedAt: true,
      createdAt: true,
      bookedBy: { select: { email: true } },
    },
  });
  return rows.map((row) => ({
    ...row,
    videoUrl: row.videoUrl ? playableVideoUrl(row.videoUrl) : null,
  }));
}

export type AdminSponsorship = Awaited<
  ReturnType<typeof listSponsorshipsForAdmin>
>[number];

async function transition(
  id: string,
  from: SponsorshipStatus[],
  apply: (
    row: { placement: SponsorshipPlacement },
    tx: Prisma.TransactionClient,
  ) => Promise<void>,
) {
  await prisma.$transaction(
    async (tx) => {
      const row = await tx.sponsorship.findUnique({
        where: { id },
        select: { status: true, placement: true },
      });
      if (!row) throw new ApiError(404, "That sponsorship no longer exists.");
      if (!from.includes(row.status)) {
        throw new ApiError(
          409,
          `A ${row.status.toLowerCase().replace("_", " ")} booking cannot be changed this way.`,
        );
      }
      await apply(row, tx);
    },
    // Serializable so two approvals cannot both claim the last slot.
    { isolationLevel: "Serializable" },
  );
}

/** Approve (or reschedule) for one month from `startsAt`, within capacity. */
export async function approveSponsorship(
  id: string,
  startsAt: Date,
  reviewerId: string,
) {
  if (Number.isNaN(startsAt.getTime())) {
    throw new ApiError(400, "Choose a valid start date.");
  }
  const endsAt = sponsorshipEndsAt(startsAt);
  await transition(id, ["PENDING_REVIEW", "APPROVED"], async ({ placement }, tx) => {
    await assertSlotFree(tx, placement, { startsAt, endsAt }, id);
    await tx.sponsorship.update({
      where: { id },
      data: {
        status: "APPROVED",
        startsAt,
        endsAt,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });
}

export async function rejectSponsorship(
  id: string,
  notes: string | undefined,
  reviewerId: string,
) {
  await transition(id, ["PENDING_REVIEW"], async (_row, tx) => {
    await tx.sponsorship.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNotes: notes?.trim() || null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });
}

/** Take an approved placement down early; it stops showing on next refresh. */
export async function cancelSponsorship(id: string, reviewerId: string) {
  await transition(id, ["APPROVED"], async (_row, tx) => {
    await tx.sponsorship.update({
      where: { id },
      data: {
        status: "CANCELLED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });
}
