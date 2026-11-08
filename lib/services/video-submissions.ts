import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { cleanupR2Object } from "./r2";
import { requireSubmissionUser } from "./submission-user";
import { assertCanUpload } from "./upload-limits";
import { finishVideoUpload, type StoredVideo } from "./video-uploads";
import {
  parseVideoSubmission,
  type VideoSubmissionMetadata,
} from "./video-validation";

type Submitter = { id: string; isAdmin: boolean };

export function buildVideoSubmissionData(
  metadata: VideoSubmissionMetadata,
  user: Submitter,
  asset: StoredVideo,
) {
  const slugTitle =
    metadata.title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "video";
  const approved = user.isAdmin;
  const now = new Date();
  return {
    ...metadata,
    slug: `${slugTitle}-${randomUUID()}`,
    submittedById: user.id,
    videoUrl: asset.url,
    storageKey: asset.key,
    durationSeconds: asset.durationSeconds,
    reviewStatus: approved
      ? ("APPROVED" as const)
      : ("PENDING_REVIEW" as const),
    reviewedById: approved ? user.id : null,
    reviewedAt: approved ? now : null,
    publishedAt: approved ? now : null,
  };
}

/**
 * Finalise a video the browser already uploaded to R2. Metadata is checked
 * first, so a rejected form leaves the uploaded parts in place for a retry.
 */
export async function createVideoSubmission(request: Request) {
  const user = await requireSubmissionUser();
  const { metadata, upload } = await parseVideoSubmission(
    request,
    user.isAdmin,
  );
  // A retried request whose first attempt already saved the video.
  if (
    await prisma.video.findUnique({
      where: { storageKey: upload.key },
      select: { id: true },
    })
  ) {
    throw new ApiError(409, "This video was already submitted.");
  }
  // Re-checked here: two uploads started side by side both passed the start check.
  await assertCanUpload(user, "video");
  const asset = await finishVideoUpload(upload, "video", user.id);

  try {
    return await prisma.video.create({
      data: buildVideoSubmissionData(metadata, user, asset),
      // Return a receipt, keeping moderation fields and attribution internals server-side.
      select: {
        id: true,
        slug: true,
        title: true,
        reviewStatus: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  } catch (error) {
    // A concurrent duplicate owns the object now; never delete it.
    if (isUniqueViolation(error, "storageKey")) {
      throw new ApiError(409, "This video was already submitted.");
    }
    await cleanupR2Object(asset.key);
    throw error;
  }
}
