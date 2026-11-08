import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import {
  MAX_SPONSOR_ICON_BYTES,
  SPONSOR_ICON_TYPES,
} from "@/lib/sponsorships";

const httpsUrl = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.includes(".") &&
      !url.username &&
      !url.password
    );
  }, "Use an HTTPS link without credentials.");

export const sponsorshipBookingSchema = z.strictObject({
  placement: z.enum(["NAVBAR", "FEED_VIDEO"]),
  productName: z.string().trim().min(1).max(120),
  websiteUrl: httpsUrl,
  contactEmail: z.email().max(320),
  description: z.string().trim().min(1).max(500),
});

export type SponsorshipBooking = z.infer<typeof sponsorshipBookingSchema>;

const BOOKING_FIELDS = new Set([
  "placement",
  "productName",
  "websiteUrl",
  "contactEmail",
  "description",
  "icon",
  "video",
]);

/** Read the text fields of a multipart booking; files are checked separately. */
export function parseSponsorshipFields(form: FormData): SponsorshipBooking {
  for (const key of form.keys()) {
    if (!BOOKING_FIELDS.has(key) || form.getAll(key).length !== 1) {
      throw new ApiError(400, "The booking contains unexpected fields.");
    }
  }
  const input = Object.fromEntries(
    [...sponsorshipBookingSchema.keyof().options].map((key) => [
      key,
      form.get(key),
    ]),
  );
  const result = sponsorshipBookingSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(
      400,
      `${issue.path.join(".") || "booking"}: ${issue.message}`,
    );
  }
  return result.data;
}

/** Trust the bytes, not the browser-reported type. */
export async function validateSponsorIcon(entry: FormDataEntryValue | null) {
  if (entry === null) return null;
  if (!(entry instanceof File) || entry.size === 0) {
    throw new ApiError(400, "Choose a non-empty icon image.");
  }
  if (entry.size > MAX_SPONSOR_ICON_BYTES) {
    throw new ApiError(413, "The icon must be no larger than 2 MB.");
  }
  if (!Object.hasOwn(SPONSOR_ICON_TYPES, entry.type)) {
    throw new ApiError(415, "Upload a PNG, JPG or WebP icon.");
  }
  const header = new Uint8Array(await entry.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) =>
    new TextDecoder().decode(header.slice(start, end));
  const matches =
    entry.type === "image/png"
      ? header[0] === 0x89 && ascii(1, 4) === "PNG"
      : entry.type === "image/jpeg"
        ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        : ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (!matches) {
    throw new ApiError(415, "The icon contents do not match its format.");
  }
  return {
    file: entry,
    extension: SPONSOR_ICON_TYPES[entry.type as keyof typeof SPONSOR_ICON_TYPES],
  };
}

type Window = { startsAt: Date; endsAt: Date };

/**
 * The most bookings live at any single instant inside `window`. Concurrency can
 * only rise at a start time, so checking the window start and every start that
 * falls inside it is exact.
 */
export function peakConcurrency(window: Window, others: Window[]) {
  const overlapping = others.filter(
    (other) => other.startsAt < window.endsAt && other.endsAt > window.startsAt,
  );
  const instants = [
    window.startsAt,
    ...overlapping
      .map((other) => other.startsAt)
      .filter((start) => start > window.startsAt),
  ];
  return Math.max(
    0,
    ...instants.map(
      (instant) =>
        overlapping.filter(
          (other) => other.startsAt <= instant && other.endsAt > instant,
        ).length,
    ),
  );
}
