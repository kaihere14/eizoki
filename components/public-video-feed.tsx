import { CategoryFeed } from "@/components/category-feed";
import { CATEGORY_SLUGS } from "@/lib/services/video-feed";
import {
  listHomeFeedCategories,
  listHomeFeedPage,
  readForPage,
} from "@/lib/services/public-videos";
import { getLiveFeedSponsor } from "@/lib/services/sponsorships";

/**
 * The home feed's first page, read from the cache so the whole home page is
 * prerendered and served from the CDN. A `?category=` link is applied in the
 * browser by CategoryFeed, which keeps this page free of request data.
 */
export async function PublicVideoFeed() {
  const data = await readForPage("Home feed", () =>
    Promise.all([
      listHomeFeedPage(24),
      getLiveFeedSponsor(),
      listHomeFeedCategories(),
    ]),
  );

  // Without the database, offer every category and let the feed retry.
  if (!data) return <CategoryFeed categories={CATEGORY_SLUGS} />;

  const [page, sponsor, categories] = data;
  return (
    <CategoryFeed
      categories={categories}
      initialPage={{ ...page, sponsor }}
    />
  );
}
