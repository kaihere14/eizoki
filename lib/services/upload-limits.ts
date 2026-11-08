import { ApiError } from "@/lib/api-error";
import { RESTRICTION_COPY } from "@/lib/account-limits";
import { prisma } from "@/lib/prisma";
import type { UploadPurpose } from "./video-uploads";

type Uploader = { id: string; isAdmin: boolean; uploadBanned: boolean };

/** True while one of the user's own submissions still waits for a decision. */
export async function hasVideoAwaitingReview(userId: string) {
  const pending = await prisma.video.findFirst({
    where: { submittedById: userId, reviewStatus: "PENDING_REVIEW" },
    select: { id: true },
  });
  return pending !== null;
}

/**
 * Storage guard. A user with uploads turned off cannot upload anything, and a
 * community submitter may only have one video waiting for review at a time,
 * so one account cannot fill the bucket with 500 MB files. Admin submissions
 * publish immediately and are never limited. Sponsor videos keep their own
 * limit of open bookings.
 */
export async function assertCanUpload(user: Uploader, purpose: UploadPurpose) {
  if (user.uploadBanned) {
    throw new ApiError(403, RESTRICTION_COPY.UPLOAD_BANNED.message, "UPLOAD_BANNED");
  }
  if (purpose === "video" && !user.isAdmin && (await hasVideoAwaitingReview(user.id))) {
    throw new ApiError(409, RESTRICTION_COPY.REVIEW_PENDING.message, "REVIEW_PENDING");
  }
}
