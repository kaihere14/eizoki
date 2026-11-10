import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { buildSitemap } from "@/lib/sitemap";
import {
  countPublicVideosByTag,
  listPublicVideoIndex,
  MIN_TAG_PAGE_VIDEOS,
} from "@/lib/services/public-videos";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [videos, tagCounts] = await Promise.all([
      listPublicVideoIndex(),
      countPublicVideosByTag(),
    ]);
    const tags = Object.entries(tagCounts)
      .filter(([, count]) => count >= MIN_TAG_PAGE_VIDEOS)
      .map(([tag]) => tag);
    return buildSitemap({ videos, tags });
  } catch (error) {
    // Still publish every page that does not depend on the database, and
    // render again on the next request instead of keeping this partial file.
    console.error("Sitemap videos could not be loaded", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    await connection();
    return buildSitemap({ videos: [], tags: [] });
  }
}
