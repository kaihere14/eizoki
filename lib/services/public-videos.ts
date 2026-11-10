import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { VideoCategory, VideoMetadata } from "@/lib/videos";
import { VIDEO_TAG_VALUES, type VideoTag } from "@/lib/video-tags";
import {
  publicVideoWhere,
  toVideoMetadata,
  VIDEO_FEED_SELECT,
} from "./video-feed";

/**
 * Cached reads behind the public, indexable pages: category landings, video
 * pages, tag pages and the sitemap. Every entry carries this tag, so a
 * publish, approval or deletion refreshes them all at once.
 */
export const PUBLIC_VIDEOS_TAG = "public-videos";

/** A tag gets its own indexable page only with at least this many videos. */
export const MIN_TAG_PAGE_VIDEOS = 5;

/** Call after any change to which videos are public or what they say. */
export function invalidatePublicVideos() {
  revalidateTag(PUBLIC_VIDEOS_TAG, { expire: 0 });
}

function cachePublicVideos() {
  cacheTag(PUBLIC_VIDEOS_TAG);
  cacheLife("hours");
}

/** One public video by its URL slug, or null when it is missing or unpublished. */
export async function getPublicVideoBySlug(
  slug: string,
): Promise<VideoMetadata | null> {
  "use cache";
  cachePublicVideos();
  const row = await prisma.video.findFirst({
    where: { ...publicVideoWhere(), slug },
    select: VIDEO_FEED_SELECT,
  });
  return row ? toVideoMetadata(row) : null;
}

/** The newest public videos, optionally limited to one category or tag. */
export async function listLatestPublicVideos({
  category,
  tag,
  limit,
  excludeId,
}: {
  category?: VideoCategory;
  tag?: VideoTag;
  limit: number;
  excludeId?: string;
}): Promise<VideoMetadata[]> {
  "use cache";
  cachePublicVideos();
  const rows = await prisma.video.findMany({
    where: {
      ...publicVideoWhere(),
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
    select: VIDEO_FEED_SELECT,
  });
  return rows.map(toVideoMetadata);
}

/**
 * Videos to suggest next to one video: same category first, then the rest of
 * the catalogue, so a small category still gets a full row.
 */
export async function listRelatedVideos(
  video: Pick<VideoMetadata, "id" | "category">,
  limit = 6,
): Promise<VideoMetadata[]> {
  "use cache";
  cachePublicVideos();
  const sameCategory = await listLatestPublicVideos({
    category: video.category,
    limit,
    excludeId: video.id,
  });
  if (sameCategory.length >= limit) return sameCategory;
  const others = await listLatestPublicVideos({
    limit: limit * 2,
    excludeId: video.id,
  });
  const seen = new Set(sameCategory.map((item) => item.id));
  return [
    ...sameCategory,
    ...others.filter((item) => !seen.has(item.id)),
  ].slice(0, limit);
}

/** Lightweight rows for every public video: links, sitemap and static params. */
export type PublicVideoIndexEntry = {
  slug: string;
  title: string;
  description?: string;
  category: VideoCategory;
  tags: string[];
  creatorName: string;
  posterUrl?: string;
  videoUrl: string;
  durationSeconds?: number;
  publishedAt?: string;
  updatedAt: string;
};

export async function listPublicVideoIndex(): Promise<PublicVideoIndexEntry[]> {
  "use cache";
  cachePublicVideos();
  const rows = await prisma.video.findMany({
    where: publicVideoWhere(),
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: { ...VIDEO_FEED_SELECT, updatedAt: true },
  });
  return rows.map((row) => {
    const video = toVideoMetadata(row);
    return {
      slug: video.slug,
      title: video.title,
      description: video.description,
      category: video.category,
      tags: video.tags,
      creatorName: video.creator.name,
      posterUrl: video.posterUrl,
      videoUrl: video.videoUrl,
      durationSeconds: video.durationSeconds,
      publishedAt: video.publishedAt,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

/** Public video counts for each catalogue tag, including tags with none. */
export async function countPublicVideosByTag(): Promise<Record<VideoTag, number>> {
  "use cache";
  cachePublicVideos();
  const index = await listPublicVideoIndex();
  const counts = Object.fromEntries(
    VIDEO_TAG_VALUES.map((tag) => [tag, 0]),
  ) as Record<VideoTag, number>;
  for (const entry of index) {
    for (const tag of entry.tags) {
      if (tag in counts) counts[tag as VideoTag] += 1;
    }
  }
  return counts;
}

/**
 * Runs a cached read for a public page. If the database cannot be reached
 * the error is logged and the render is deferred to request time instead of
 * being baked into the prerendered page; the caller then shows its fallback.
 */
export async function readForPage<T>(
  label: string,
  read: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    console.error(`${label} could not be loaded`, {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    await connection();
    return undefined;
  }
}
