import type { MetadataRoute } from "next";
import { absoluteUrl, PUBLIC_PAGES } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Omit lastModified until reliable content modification dates are available.
  return Object.values(PUBLIC_PAGES).map((page) => ({
    url: absoluteUrl(page.path),
  }));
}
