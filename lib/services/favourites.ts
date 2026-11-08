import { auth } from "@clerk/nextjs/server";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./current-user";
import {
  toVideoMetadata,
  VIDEO_FEED_SELECT,
  videoFeedQuerySchema,
  type VideoFeedQuery,
} from "./video-feed";

export const favouritesQuerySchema = videoFeedQuerySchema.pick({
  cursor: true,
  limit: true,
});

/**
 * Only public catalogue entries can be saved. A video that is later rejected or
 * unpublished disappears from every shelf without touching the bookmark row,
 * so the list can never leak a private submission.
 */
function publicVideoWhere() {
  return {
    reviewStatus: "APPROVED" as const,
    publishedAt: { not: null, lte: new Date() },
  };
}

export async function listFavouriteVideos(
  query: Pick<VideoFeedQuery, "cursor" | "limit">,
) {
  const user = await requireUser("Sign in to view your favourites.");
  const rows = await prisma.favourite.findMany({
    where: { userId: user.id, video: publicVideoWhere() },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      video: { select: VIDEO_FEED_SELECT },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = rows.slice(0, query.limit);

  return {
    videos: page.map((row) => ({
      ...toVideoMetadata(row.video),
      favouritedAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** Returns false for signed-out visitors instead of making the UI handle 401. */
export async function isVideoFavourited(videoId: string) {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return false;

  const favourite = await prisma.favourite.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
    select: { id: true },
  });
  return Boolean(favourite);
}

/** Idempotent: saving an already-saved video keeps the original shelf order. */
export async function addFavourite(videoId: string) {
  const user = await requireUser("Sign in to save favourites.");

  const video = await prisma.video.findFirst({
    where: { id: videoId, ...publicVideoWhere() },
    select: { id: true },
  });
  if (!video) throw new ApiError(404, "Video not found.");

  await prisma.favourite.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    create: { userId: user.id, videoId },
    update: {},
  });
}

/** Idempotent: removing a bookmark that is already gone is still a success. */
export async function removeFavourite(videoId: string) {
  const user = await requireUser("Sign in to edit your favourites.");
  await prisma.favourite.deleteMany({
    where: { userId: user.id, videoId },
  });
}
