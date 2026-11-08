import type { VideoMetadata } from "@/lib/videos";

export type FavouriteVideo = VideoMetadata & {
  /** When the user saved it — the shelf is ordered by this, not publication. */
  favouritedAt: string;
};

export type FavouritesPage = {
  videos: FavouriteVideo[];
  nextCursor: string | null;
};

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return new Error(
    typeof body?.error === "string"
      ? body.error
      : "The request could not be completed. Please try again.",
  );
}

export async function fetchFavourites(
  signal?: AbortSignal,
  cursor?: string,
): Promise<FavouritesPage> {
  const query = new URLSearchParams({ limit: "24" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`/api/favourites?${query}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export async function fetchFavouriteStatus(
  videoId: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await fetch(
    `/api/videos/${encodeURIComponent(videoId)}/favourite`,
    { cache: "no-store", signal },
  );
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { favourited?: unknown };
  return body.favourited === true;
}

/** PUT saves and DELETE removes; both are idempotent on the server. */
export async function setVideoFavourite(videoId: string, favourited: boolean) {
  const response = await fetch(`/api/videos/${encodeURIComponent(videoId)}/favourite`, {
    method: favourited ? "PUT" : "DELETE",
  });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { favourited?: unknown };
  return body.favourited === true;
}
