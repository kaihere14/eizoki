import type { VideoFeedPage } from "@/lib/video-feed";
import { CategoryFeed } from "@/components/category-feed";
import {
  CATEGORY_SLUGS,
  listPublicCategories,
  listPublicVideos,
} from "@/lib/services/video-feed";
import { getLiveFeedSponsor } from "@/lib/services/sponsorships";
import type { VideoCategory } from "@/lib/videos";

function parseCategory(value: unknown): VideoCategory | undefined {
  return typeof value === "string" &&
    (CATEGORY_SLUGS as readonly string[]).includes(value)
    ? (value as VideoCategory)
    : undefined;
}

/**
 * Share the API's publication rules and sponsorship logic with server
 * rendering. `?category=` picks the first filter, so a shared link opens on it.
 */
export async function PublicVideoFeed({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const category = parseCategory((await searchParams).category);

  let initialPage: VideoFeedPage | undefined;
  // Without the database, offer every category rather than none.
  let categories: VideoCategory[] = CATEGORY_SLUGS;
  try {
    const [page, sponsor, available] = await Promise.all([
      listPublicVideos({ limit: 24, category }),
      getLiveFeedSponsor(),
      listPublicCategories(),
    ]);
    initialPage = { ...page, sponsor };
    // Keep a linked category visible even if it has no public videos yet.
    categories = CATEGORY_SLUGS.filter(
      (slug) => available.includes(slug) || slug === category,
    );
  } catch (error) {
    console.error("Server video feed failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    // Preserve the existing retry UI if the database is temporarily unavailable.
  }

  return (
    <CategoryFeed
      categories={categories}
      initialCategory={category}
      initialPage={initialPage}
    />
  );
}
