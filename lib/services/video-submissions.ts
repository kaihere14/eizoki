import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { cleanupUploadedVideo, uploadVideoToImageKit } from "./imagekit";
import { requireSubmissionUser } from "./submission-user";
import {
  parseVideoSubmission,
  type VideoSubmissionMetadata,
} from "./video-validation";
import type { UploadedVideo } from "./imagekit";

type Submitter = { id: string; isAdmin: boolean };

export function buildVideoSubmissionData(
  metadata: VideoSubmissionMetadata,
  user: Submitter,
  asset: UploadedVideo,
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
    imagekitFileId: asset.fileId,
    durationSeconds: asset.duration,
    reviewStatus: approved
      ? ("APPROVED" as const)
      : ("PENDING_REVIEW" as const),
    reviewedById: approved ? user.id : null,
    reviewedAt: approved ? now : null,
    publishedAt: approved ? now : null,
  };
}

export async function createVideoSubmission(request: Request) {
  const user = await requireSubmissionUser();
  const { file, extension, metadata } = await parseVideoSubmission(
    request,
    user.isAdmin,
  );
  const asset = await uploadVideoToImageKit(file, extension);

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
    await cleanupUploadedVideo(asset.fileId);
    throw error;
  }
}
