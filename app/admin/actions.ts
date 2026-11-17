"use server";

import { updateTag } from "next/cache";
import { ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/services/current-user";
import { PUBLIC_VIDEOS_TAG } from "@/lib/services/public-videos";
import { SPONSORSHIP_CACHE_TAG } from "@/lib/services/sponsorships";

export type RefreshCacheState = {
  error: string | null;
  /** When the last refresh succeeded, as an ISO string. */
  refreshedAt: string | null;
};

/**
 * Expires every cached public read: the home feed, category, video and tag
 * pages, the sitemap, and the navbar and feed sponsors. Use it after editing
 * the database directly, which no app code knows to invalidate. The next
 * visit to each page rebuilds it from Postgres.
 *
 * CDN copies of /api/feed and /api/search are not affected; they expire on
 * their own within 5 minutes.
 */
export async function refreshSiteCacheAction(
  state: RefreshCacheState,
): Promise<RefreshCacheState> {
  try {
    // Server actions are public endpoints: re-check admin on every call.
    const user = await requireUser();
    if (!user.isAdmin) throw new ApiError(403, "Only admins can do that.");
  } catch (error) {
    if (error instanceof ApiError) return { ...state, error: error.message };
    console.error("Cache refresh failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { ...state, error: "The cache could not be refreshed. Please try again." };
  }

  updateTag(PUBLIC_VIDEOS_TAG);
  updateTag(SPONSORSHIP_CACHE_TAG);
  return { error: null, refreshedAt: new Date().toISOString() };
}
