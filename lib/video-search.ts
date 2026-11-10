import type { VideoMetadata } from "@/lib/videos";

/** Shorter queries match too much of the catalogue to be useful. */
export const MIN_SEARCH_LENGTH = 2;

/** Asks the API for the public videos that best match a typed query. */
export async function fetchVideoSearch(
  query: string,
  { signal, limit = 12 }: { signal?: AbortSignal; limit?: number } = {},
): Promise<VideoMetadata[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`/api/search?${params.toString()}`, {
    signal,
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
        : "Search is unavailable right now. Please try again.",
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("videos" in body) ||
    !Array.isArray(body.videos)
  ) {
    throw new Error("Search returned an unexpected response.");
  }

  return body.videos as VideoMetadata[];
}
