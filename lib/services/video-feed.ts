import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AVATAR_IMAGES } from "@/lib/user";
import { deliveredVideoUrl, r2ObjectUrl } from "./media-url";
import {
  CATEGORY_LABELS,
  type CreatorProfile,
  type PromptStatus,
  type VideoCategory,
  type VideoMetadata,
} from "@/lib/videos";

export const CATEGORY_SLUGS = Object.keys(CATEGORY_LABELS) as [
  VideoCategory,
  ...VideoCategory[],
];

const MAX_PAGE_SIZE = 48;

export const videoFeedQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(24),
  category: z.enum(CATEGORY_SLUGS).optional(),
});

export type VideoFeedQuery = z.infer<typeof videoFeedQuerySchema>;

const PROMPT_STATUS: Record<string, PromptStatus> = {
  ORIGINAL: "original",
  RECONSTRUCTED: "reconstructed",
  UNAVAILABLE: "unavailable",
};

function platformFor(url?: string | null): CreatorProfile["platform"] {
  if (!url) return undefined;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
  if (hostname === "x.com" || hostname === "twitter.com") return "x";
  if (hostname === "instagram.com") return "instagram";
  if (
    hostname === "youtube.com" ||
    hostname === "youtu.be" ||
    hostname === "m.youtube.com"
  )
    return "youtube";
  if (hostname === "vimeo.com") return "vimeo";
  return "portfolio";
}

/** Prefer the explicit handle, then fall back to the X profile path. */
function handleFor(username?: string | null, url?: string | null) {
  const handle = username?.trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (
      ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
        parsed.hostname,
      )
    ) {
      const segment = parsed.pathname.split("/").filter(Boolean)[0];
      return segment ? `@${segment}` : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export const VIDEO_FEED_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  tags: true,
  isFeatured: true,
  creatorName: true,
  creatorUsername: true,
  creatorXUrl: true,
  creatorProfileUrl: true,
  sourceUrl: true,
  videoUrl: true,
  storageKey: true,
  posterKey: true,
  previewKey: true,
  aspectRatio: true,
  durationSeconds: true,
  promptStatus: true,
  promptText: true,
  negativePrompt: true,
  toolsUsed: true,
  curatorNotes: true,
  publishedAt: true,
  createdAt: true,
  submittedBy: { select: { avatar: true } },
} as const;

type VideoFeedRow = Prisma.VideoGetPayload<{
  select: typeof VIDEO_FEED_SELECT;
}>;

/**
 * The playable URL of a video that must still have its file. Only rejected
 * videos lose theirs, and a database check constraint guarantees that, so
 * approved and pending rows always pass.
 */
export function storedVideoUrl(row: {
  id: string;
  videoUrl: string | null;
  storageKey: string | null;
}) {
  const url = deliveredVideoUrl(row);
  if (!url) throw new Error(`Video ${row.id} has no stored file.`);
  return url;
}

export function toVideoMetadata(row: VideoFeedRow): VideoMetadata {
  return { ...videoDetails(row), videoUrl: storedVideoUrl(row) };
}

/** Everything about a video except its file, which a rejected video no longer has. */
export function videoDetails(row: VideoFeedRow): Omit<VideoMetadata, "videoUrl"> {
  const profileUrl = row.creatorProfileUrl ?? row.creatorXUrl ?? undefined;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category as VideoCategory,
    tags: row.tags,
    isFeatured: row.isFeatured,
    durationSeconds: row.durationSeconds ?? undefined,
    posterUrl: row.posterKey ? r2ObjectUrl(row.posterKey) : undefined,
    previewUrl: row.previewKey ? r2ObjectUrl(row.previewKey) : undefined,
    aspectRatio: row.aspectRatio ?? undefined,
    creator: {
      name: row.creatorName,
      avatarUrl: AVATAR_IMAGES[row.submittedBy.avatar],
      handle: handleFor(row.creatorUsername, row.creatorXUrl),
      profileUrl,
      xProfileUrl: row.creatorXUrl ?? undefined,
      platform: platformFor(profileUrl),
    },
    sourceUrl: row.sourceUrl ?? undefined,
    promptStatus: PROMPT_STATUS[row.promptStatus] ?? "unavailable",
    promptText: row.promptText ?? undefined,
    negativePrompt: row.negativePrompt ?? undefined,
    toolsUsed: row.toolsUsed,
    curatorNotes: row.curatorNotes ?? undefined,
    publishedAt: row.publishedAt?.toISOString(),
  };
}

/** Only approved videos whose publication time has passed are public. */
export function publicVideoWhere(now = new Date()) {
  return {
    reviewStatus: "APPROVED",
    publishedAt: { not: null, lte: now },
  } satisfies Prisma.VideoWhereInput;
}

/**
 * Categories that have at least one public video, in the curated order of
 * CATEGORY_LABELS. The category bar shows only these, so no filter is empty.
 */
export async function listPublicCategories(): Promise<VideoCategory[]> {
  const rows = await prisma.video.findMany({
    where: publicVideoWhere(),
    distinct: ["category"],
    select: { category: true },
  });
  const present = new Set(rows.map((row) => row.category));
  return CATEGORY_SLUGS.filter((slug) => present.has(slug));
}

/**
 * The public catalogue is keyset-paginated by publication time. The id is the
 * tie-breaker so pages stay stable when several videos share a timestamp.
 */
export async function listPublicVideos(query: VideoFeedQuery) {
  const rows = await prisma.video.findMany({
    where: {
      ...publicVideoWhere(),
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: VIDEO_FEED_SELECT,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const videos = page.map(toVideoMetadata);

  return {
    videos,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
