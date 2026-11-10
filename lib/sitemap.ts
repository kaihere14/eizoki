import type { MetadataRoute } from "next";
import { absoluteUrl, blogPostPath, PUBLIC_PAGES, tagPath, videoPath } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog";
import { CATEGORY_LANDING_LIST } from "@/lib/seo-categories";
import type { PublicVideoIndexEntry } from "@/lib/services/public-videos";

/**
 * Next.js writes sitemap values into the XML as they are, so text from
 * creators (a title with "&" in it) must be escaped here or the file breaks.
 */
export function xmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Google's limits: title 100 characters, description 2048. */
function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function newest(dates: (string | undefined)[]) {
  const sorted = dates.filter((date): date is string => Boolean(date)).sort();
  return sorted.at(-1);
}

export function buildSitemap({
  videos,
  tags,
}: {
  /** Every public video; empty when the database could not be read. */
  videos: PublicVideoIndexEntry[];
  /** Tags that have their own page. */
  tags: string[];
}): MetadataRoute.Sitemap {
  const staticPages = Object.values(PUBLIC_PAGES)
    .filter((page) => page.path !== "/blog")
    .map((page) => ({
      url: absoluteUrl(page.path),
      ...(page.path === "/"
        ? { lastModified: newest(videos.map((video) => video.updatedAt)) }
        : {}),
    }));

  const categories = CATEGORY_LANDING_LIST.map((landing) => ({
    url: absoluteUrl(landing.path),
    lastModified: newest(
      videos
        .filter((video) => video.category === landing.category)
        .map((video) => video.updatedAt),
    ),
  }));

  const tagPages = tags.map((tag) => ({
    url: absoluteUrl(tagPath(tag)),
    lastModified: newest(
      videos.filter((video) => video.tags.includes(tag)).map((video) => video.updatedAt),
    ),
  }));

  const blog = [
    {
      url: absoluteUrl("/blog"),
      lastModified: newest(BLOG_POSTS.map((post) => post.updatedAt ?? post.publishedAt)),
    },
    ...BLOG_POSTS.map((post) => ({
      url: absoluteUrl(blogPostPath(post.slug)),
      lastModified: post.updatedAt ?? post.publishedAt,
    })),
  ];

  const videoPages = videos.map((video) => ({
    url: absoluteUrl(videoPath(video.slug)),
    lastModified: video.updatedAt,
    // Google's video sitemap needs a thumbnail; videos without a poster are
    // still listed as pages.
    ...(video.posterUrl
      ? {
          videos: [
            {
              title: xmlText(clip(video.title, 100)),
              thumbnail_loc: xmlText(video.posterUrl),
              description: xmlText(
                clip(
                  video.description?.trim() ||
                    `${video.title} by ${video.creatorName}, a hand-picked AI video on Eizoki.`,
                  2048,
                ),
              ),
              content_loc: xmlText(video.videoUrl),
              ...(video.durationSeconds
                ? { duration: Math.max(1, Math.round(video.durationSeconds)) }
                : {}),
              ...(video.publishedAt ? { publication_date: video.publishedAt } : {}),
            },
          ],
        }
      : {}),
  }));

  // Drop undefined lastModified so no date is ever invented.
  return [...staticPages, ...categories, ...tagPages, ...blog, ...videoPages].map(
    (entry) =>
      entry.lastModified === undefined
        ? Object.fromEntries(
            Object.entries(entry).filter(([key]) => key !== "lastModified"),
          ) as MetadataRoute.Sitemap[number]
        : entry,
  );
}
