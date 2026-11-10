import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  blogPostPath,
  isoDuration,
  pageGraph,
  pageMetadata,
  PRIVATE_ROBOTS,
  PUBLIC_PAGES,
  serializeJsonLd,
  siteGraph,
  SITE_URL,
  snippet,
  videoPath,
} from "@/lib/seo";
import { buildSitemap, xmlText } from "@/lib/sitemap";
import { BLOG_POSTS } from "@/lib/blog";
import { CATEGORY_LANDINGS } from "@/lib/seo-categories";
import type { PublicVideoIndexEntry } from "@/lib/services/public-videos";
import robots from "@/app/robots";
import { GET as llms } from "@/app/llms.txt/route";

describe("SEO discovery and structured data", () => {
  test("uses the production xyz domain for search discovery", () => {
    expect(SITE_URL).toBe("https://www.eizoki.xyz");
    expect(absoluteUrl("/sitemap.xml")).toBe("https://www.eizoki.xyz/sitemap.xml");
  });
  test("untrusted text cannot escape the JSON-LD script", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: '</script><script>alert("creator input")</script>',
    };
    const json = serializeJsonLd(data);
    expect(JSON.parse(json)).toEqual(data);
    expect(json).not.toContain("<");
    const html = renderToStaticMarkup(createElement(JsonLd, { data }));
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  test("each indexed page has matching canonical, social URL, and schema URL", () => {
    for (const page of Object.values(PUBLIC_PAGES)) {
      const url = absoluteUrl(page.path);
      const metadata = pageMetadata(page);
      const graph = pageGraph(page);
      expect(metadata.alternates?.canonical).toBe(url);
      expect(metadata.openGraph?.url).toBe(url);
      expect(metadata.openGraph?.description).toBe(page.description);
      expect(metadata.twitter?.description).toBe(page.description);
      expect(metadata.openGraph?.images).toEqual([{
        url: absoluteUrl("/opengraph-image.jpg"),
        width: 1200,
        height: 630,
        alt: "Eizoki — AI video and motion design inspiration",
      }]);
      expect(metadata.twitter?.images).toEqual([absoluteUrl("/twitter-image.jpg")]);
      expect(graph.url).toBe(url);
      expect(graph["@context"]).toBe("https://schema.org");
    }
  });

  test("page entity references resolve to shared website and organization IDs", () => {
    const entities = siteGraph()["@graph"];
    const ids = new Set(entities.map((entity) => entity["@id"]));
    for (const page of Object.values(PUBLIC_PAGES)) {
      const graph = pageGraph(page);
      expect(ids.has(graph.isPartOf["@id"])).toBe(true);
      expect(ids.has(graph.about["@id"])).toBe(true);
    }
    // A search action would imply a search endpoint that this site does not have.
    expect(JSON.stringify(entities)).not.toContain("SearchAction");
  });

  test("sitemap lists every indexable page once, without invented dates", () => {
    const entries = buildSitemap({ videos: [], tags: [] });
    const urls = entries.map((entry) => entry.url);
    for (const page of Object.values(PUBLIC_PAGES)) {
      expect(urls).toContain(absoluteUrl(page.path));
    }
    for (const landing of Object.values(CATEGORY_LANDINGS)) {
      expect(urls).toContain(absoluteUrl(landing.path));
    }
    for (const post of BLOG_POSTS) {
      expect(urls).toContain(absoluteUrl(blogPostPath(post.slug)));
    }
    expect(new Set(urls).size).toBe(urls.length);
    // With no videos there is no real modification date for these pages.
    for (const path of ["/", "/info", "/sponsor", "/ai-motion-design"]) {
      const entry = entries.find((item) => item.url === absoluteUrl(path));
      expect(entry?.lastModified).toBeUndefined();
    }
  });

  test("sitemap video entries escape creator text and need a thumbnail", () => {
    const video: PublicVideoIndexEntry = {
      slug: "salt-&-light",
      title: 'Salt & Light <"loop">',
      category: "ai-motion-design",
      tags: ["cinematic"],
      creatorName: "Ana & Co",
      posterUrl: "https://cdn.example.com/p.webp?a=1&b=2",
      videoUrl: "https://cdn.example.com/v.mp4",
      durationSeconds: 12.4,
      publishedAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
    };
    const entries = buildSitemap({
      videos: [video, { ...video, slug: "no-poster", posterUrl: undefined }],
      tags: ["cinematic"],
    });
    const page = entries.find((entry) => entry.url === absoluteUrl(videoPath(video.slug)));
    expect(page?.url).toBe("https://www.eizoki.xyz/v/salt-%26-light");
    expect(page?.lastModified).toBe(video.updatedAt);
    expect(page?.videos?.[0]).toMatchObject({
      title: "Salt &amp; Light &lt;&quot;loop&quot;&gt;",
      thumbnail_loc: "https://cdn.example.com/p.webp?a=1&amp;b=2",
      duration: 12,
    });
    expect(page?.videos?.[0].description).toContain("Ana &amp; Co");
    const bare = entries.find((entry) => entry.url === absoluteUrl("/v/no-poster"));
    expect(bare?.videos).toBeUndefined();
    expect(entries.map((entry) => entry.url)).toContain(absoluteUrl("/tag/cinematic"));
    expect(
      entries.find((entry) => entry.url === absoluteUrl("/ai-motion-design"))?.lastModified,
    ).toBe(video.updatedAt);
  });

  test("xml text escaping covers every reserved character", () => {
    expect(xmlText(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });

  test("category landings target their own path with snippet-length copy", () => {
    for (const [category, landing] of Object.entries(CATEGORY_LANDINGS)) {
      expect(landing.category).toBe(category as typeof landing.category);
      expect(landing.path as string).toBe(`/${category}`);
      expect(landing.title.length).toBeLessThanOrEqual(65);
      expect(landing.description.length).toBeLessThanOrEqual(165);
      expect(landing.faqs.length).toBeGreaterThan(0);
    }
  });

  test("every blog post has a body file and a unique slug", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(existsSync(join(import.meta.dir, "../../content/blog", `${slug}.tsx`))).toBe(true);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test("video durations and snippets are search-ready", () => {
    expect(isoDuration(65)).toBe("PT1M5S");
    expect(isoDuration(120)).toBe("PT2M");
    expect(isoDuration(9.6)).toBe("PT10S");
    expect(isoDuration(undefined)).toBeUndefined();
    expect(snippet("short text")).toBe("short text");
    const long = snippet("word ".repeat(80));
    expect(long.length).toBeLessThanOrEqual(158);
    expect(long.endsWith("…")).toBe(true);
  });

  test("crawl rules allow public pages and point to the sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
      sitemap: absoluteUrl("/sitemap.xml"),
    });
    expect(PRIVATE_ROBOTS).toMatchObject({
      index: false,
      googleBot: { index: false },
    });
  });

  test("optional AI discovery map contains only the public page registry", async () => {
    const response = llms();
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    for (const page of Object.values(PUBLIC_PAGES)) {
      expect(text).toContain(absoluteUrl(page.path));
    }
    expect(text).not.toContain("/admin");
    expect(text).not.toContain("/favourites");
  });
});
