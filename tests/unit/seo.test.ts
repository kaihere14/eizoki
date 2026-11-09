import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  pageGraph,
  pageMetadata,
  PRIVATE_ROBOTS,
  PUBLIC_PAGES,
  serializeJsonLd,
  siteGraph,
  SITE_URL,
} from "@/lib/seo";
import sitemap from "@/app/sitemap";
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

  test("sitemap includes all public canonicals without invented modification dates", () => {
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual(
      Object.values(PUBLIC_PAGES).map((page) => absoluteUrl(page.path)),
    );
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
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
