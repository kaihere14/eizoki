import type { VideoCategory, VideoMetadata } from "@/lib/videos";

export interface VideoFeedPage {
  videos: VideoMetadata[];
  nextCursor: string | null;
}

interface FeedOptions {
  cursor?: string;
  limit?: number;
  category?: VideoCategory;
  signal?: AbortSignal;
}

const DEFAULT_LIMIT = 24;

/**
 * Reads one page of the public catalogue. The API owns visibility rules, so
 * the browser never has to filter pending or unpublished submissions.
 */
export async function fetchVideoFeed({
  cursor,
  limit = DEFAULT_LIMIT,
  category,
  signal,
}: FeedOptions = {}): Promise<VideoFeedPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  if (category) query.set("category", category);

  const response = await fetch(`/api/videos?${query.toString()}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "The videos could not be loaded. Please try again.",
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("videos" in body) ||
    !Array.isArray(body.videos) ||
    !("nextCursor" in body) ||
    !(typeof body.nextCursor === "string" || body.nextCursor === null)
  ) {
    throw new Error("The video feed returned an unexpected response.");
  }

  return {
    videos: body.videos as VideoMetadata[],
    nextCursor: body.nextCursor,
  };
}
