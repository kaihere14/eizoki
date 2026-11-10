import type { VideoCategory } from "@/lib/videos";

/**
 * Blog post registry. The article body lives in `content/blog/<slug>.tsx`
 * and is registered in `content/blog/index.ts`; this file holds only what
 * listings, metadata and the sitemap need, so it stays cheap to import.
 */
export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description and listing summary. Aim for 160 characters or fewer. */
  description: string;
  /** YYYY-MM-DD. */
  publishedAt: string;
  /** YYYY-MM-DD; set when the article changes meaningfully. */
  updatedAt?: string;
  readingMinutes: number;
  /** Category landings this post supports; they link back to it. */
  categories: VideoCategory[];
};

/** Newest first. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-write-ai-video-prompts-for-motion-design",
    title: "How to Write AI Video Prompts for Motion Design",
    description:
      "A practical structure for AI video prompts: subject, motion, camera, light, style and pacing, plus how to adapt a prompt you found to your own project.",
    publishedAt: "2026-11-10",
    readingMinutes: 7,
    categories: ["ai-motion-design", "cinematic-stories", "3d-experiments"],
  },
  {
    slug: "ai-product-launch-video-guide",
    title: "AI Product Launch Videos: Structure, Pacing and Examples",
    description:
      "How to plan an AI product launch video that people watch to the end: the hook, the product reveal, pacing, and where AI video tools help.",
    publishedAt: "2026-11-10",
    readingMinutes: 6,
    categories: ["launch-videos", "ui-motion"],
  },
  {
    slug: "what-is-ai-motion-design",
    title: "What Is AI Motion Design? A Guide with Examples",
    description:
      "AI motion design explained: what it is, how creators make it, where it works and where it doesn't, with curated examples you can study.",
    publishedAt: "2026-11-10",
    readingMinutes: 6,
    categories: ["ai-motion-design", "kinetic-typography", "creative-experiments"],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function blogPostsForCategory(category: VideoCategory) {
  return BLOG_POSTS.filter((post) => post.categories.includes(category));
}

export function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
