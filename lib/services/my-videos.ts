import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { deleteImageKitFile } from "./imagekit";
import { deleteR2Object } from "./r2";
import { requireSubmissionUser } from "./submission-user";
import {
  toVideoMetadata,
  VIDEO_FEED_SELECT,
  videoFeedQuerySchema,
  type VideoFeedQuery,
} from "./video-feed";

export const myVideosQuerySchema = videoFeedQuerySchema.pick({
  cursor: true,
  limit: true,
});

export async function listMyVideos(
  query: Pick<VideoFeedQuery, "cursor" | "limit">,
) {
  const user = await requireSubmissionUser("Sign in to view your videos.");
  const rows = await prisma.video.findMany({
    where: { submittedById: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: { ...VIDEO_FEED_SELECT, reviewStatus: true },
  });
  const hasMore = rows.length > query.limit;
  const page = rows.slice(0, query.limit);
  return {
    videos: page.map((row) => ({
      ...toVideoMetadata(row),
      reviewStatus: row.reviewStatus,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * Delete a video and its file. Allowed for the uploader, or for an admin.
 * `isAdmin` is read from Postgres by requireSubmissionUser, never from the
 * request, so a tampered client cannot grant itself the right to delete.
 */
export async function deleteMyVideo(id: string) {
  const user = await requireSubmissionUser("Sign in to delete a video.");
  const where = user.isAdmin ? { id } : { id, submittedById: user.id };
  const owned = await prisma.video.findFirst({
    where,
    select: { imagekitFileId: true, storageKey: true },
  });
  // Missing and someone else's video have the same response.
  if (!owned) throw new ApiError(404, "Video not found.");
  try {
    if (owned.storageKey) await deleteR2Object(owned.storageKey);
    else if (owned.imagekitFileId)
      await deleteImageKitFile(owned.imagekitFileId);
  } catch {
    throw new ApiError(
      502,
      "The video file could not be deleted. Please try again.",
    );
  }
  try {
    // Repeat the ownership condition on the mutation; concurrent deletion is safe.
    await prisma.video.deleteMany({ where });
  } catch {
    // Deleting a missing file succeeds, so retrying completes this partial deletion.
    throw new ApiError(
      500,
      "The video file was removed, but its entry could not be deleted. Please retry.",
    );
  }
}
