import { BLOG_POSTS } from "@/lib/blog";
import { absoluteUrl, blogPostPath, PUBLIC_PAGES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { CATEGORY_LANDING_LIST } from "@/lib/seo-categories";

// Optional discovery map; it is not a ranking signal or a substitute for HTML.
export function GET() {
  const links = Object.values(PUBLIC_PAGES)
    .map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`)
    .join("\n");
  const categories = CATEGORY_LANDING_LIST.map(
    (landing) => `- [${landing.title}](${absoluteUrl(landing.path)}): ${landing.description}`,
  ).join("\n");
  const guides = BLOG_POSTS.map(
    (post) => `- [${post.title}](${absoluteUrl(blogPostPath(post.slug))}): ${post.description}`,
  ).join("\n");
  return new Response(
    `# ${SITE_NAME}\n\n> ${SITE_DESCRIPTION}\n\nEizoki curates videos made by creators; it does not generate videos. Submissions are reviewed before publication. Prompts are labeled Original, Reconstructed, or Not shared. Each video has its own page at /v/<slug> with credits, tools and the prompt when shared.\n\n## Public pages\n\n${links}\n\n## Categories\n\n${categories}\n\n## Guides\n\n${guides}\n\n## Discovery\n\n- [Sitemap](${absoluteUrl("/sitemap.xml")})\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
