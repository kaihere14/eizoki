import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { playableVideoUrl } from "@/lib/video-delivery";

/** One page of the queue. The admin works through it oldest first. */
const REVIEW_PAGE_SIZE = 50;

/**
 * Videos waiting for review, oldest first, so the earliest submission is at
 * the top and new uploads join the bottom of the queue.
 */
export async function listVideosForReview() {
  const where = { reviewStatus: "PENDING_REVIEW" } as const;
  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: REVIEW_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        creatorName: true,
        creatorUsername: true,
        creatorXUrl: true,
        creatorProfileUrl: true,
        sourceUrl: true,
        videoUrl: true,
        durationSeconds: true,
        promptStatus: true,
        promptText: true,
        negativePrompt: true,
        toolsUsed: true,
        createdAt: true,
        submittedBy: { select: { email: true } },
      },
    }),
    prisma.video.count({ where }),
  ]);
  return {
    rows: rows.map((row) => ({
      ...row,
      videoUrl: playableVideoUrl(row.videoUrl),
    })),
    total,
  };
}

export type ReviewVideo = Awaited<
  ReturnType<typeof listVideosForReview>
>["rows"][number];

/** Pending counts for the admin tab badges. */
export async function countAdminQueues() {
  const [videos, sponsorships] = await Promise.all([
    prisma.video.count({ where: { reviewStatus: "PENDING_REVIEW" } }),
    prisma.sponsorship.count({ where: { status: "PENDING_REVIEW" } }),
  ]);
  return { videos, sponsorships };
}

/**
 * Move one pending video to its decision. The status condition sits on the
 * update itself, so two admins deciding at once cannot both win.
 */
async function decide(
  id: string,
  reviewStatus: "APPROVED" | "REJECTED",
  reviewNotes: string | null,
  reviewerId: string,
) {
  const now = new Date();
  const { count } = await prisma.video.updateMany({
    where: { id, reviewStatus: "PENDING_REVIEW" },
    data: {
      reviewStatus,
      reviewNotes,
      // Approval publishes immediately, like an admin's own submission.
      publishedAt: reviewStatus === "APPROVED" ? now : null,
      reviewedById: reviewerId,
      reviewedAt: now,
    },
  });
  if (count === 1) return;
  const exists = await prisma.video.findUnique({
    where: { id },
    select: { id: true },
  });
  throw exists
    ? new ApiError(409, "This video has already been reviewed.")
    : new ApiError(404, "That video no longer exists.");
}

export async function approveVideo(id: string, reviewerId: string) {
  await decide(id, "APPROVED", null, reviewerId);
}

export async function rejectVideo(
  id: string,
  notes: string | undefined,
  reviewerId: string,
) {
  await decide(id, "REJECTED", notes?.trim() || null, reviewerId);
}
