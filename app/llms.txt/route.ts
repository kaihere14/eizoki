import { absoluteUrl, PUBLIC_PAGES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// Optional discovery map; it is not a ranking signal or a substitute for HTML.
export function GET() {
  const links = Object.values(PUBLIC_PAGES)
    .map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`)
    .join("\n");
  return new Response(
    `# ${SITE_NAME}\n\n> ${SITE_DESCRIPTION}\n\nEizoki curates videos made by creators; it does not generate videos. Submissions are reviewed before publication. Prompts are labeled Original, Reconstructed, or Not shared.\n\n## Public pages\n\n${links}\n\n## Discovery\n\n- [Sitemap](${absoluteUrl("/sitemap.xml")})\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
