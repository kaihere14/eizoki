import type { Metadata } from "next";

export const SITE_URL = "https://www.eizoki.xyz";
export const SITE_NAME = "Eizoki";
export const HOME_TITLE = "Eizoki — AI Motion Design & AI Video Examples with Prompts";
export const SITE_DESCRIPTION =
  "Discover hand-curated AI motion design, AI videos, product launch films and creative experiments, with creator credits and prompts when available.";

export const PUBLIC_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export type PublicPage = {
  path: "/" | "/info" | "/sponsor" | "/blog" | "/cookies";
  title: string;
  description: string;
  schemaType: "CollectionPage" | "AboutPage" | "WebPage";
};

export const PUBLIC_PAGES = {
  home: {
    path: "/",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    schemaType: "CollectionPage",
  },
  about: {
    path: "/info",
    title: "About Eizoki",
    description:
      "Learn how Eizoki curates AI videos, motion design and launch films, credits creators, and labels original, reconstructed and unavailable prompts.",
    schemaType: "AboutPage",
  },
  sponsor: {
    path: "/sponsor",
    title: "Sponsor Eizoki",
    description:
      "Reach the Eizoki creative community with a featured video or navbar sponsorship. Explore placements for your product or launch film.",
    schemaType: "WebPage",
  },
  blog: {
    path: "/blog",
    title: "AI Motion Design Blog",
    description:
      "Guides to AI motion design, AI video prompts and launch films, with breakdowns of real videos from the Eizoki collection.",
    schemaType: "CollectionPage",
  },
  cookies: {
    path: "/cookies",
    title: "Cookie Policy",
    description:
      "What Eizoki stores in your browser: essential sign-in and preference cookies, optional PostHog analytics, and how to change your choice.",
    schemaType: "WebPage",
  },
} as const satisfies Record<string, PublicPage>;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function pageMetadata(page: PublicPage): Metadata {
  const title = page.path === "/" ? page.title : `${page.title} | ${SITE_NAME}`;
  return seoMetadata({ path: page.path, title, description: page.description });
}

const DEFAULT_SOCIAL_IMAGE = {
  url: absoluteUrl("/opengraph-image.jpg"),
  width: 1200,
  height: 630,
  alt: "Eizoki — AI video and motion design inspiration",
};

/**
 * Canonical, Open Graph and Twitter metadata for one indexable URL. `title`
 * is used as is, so callers include the site name where they want it.
 */
export function seoMetadata({
  path,
  title,
  description,
  image,
  type = "website",
  video,
  publishedTime,
  modifiedTime,
}: {
  path: string;
  title: string;
  description: string;
  /** A page-specific image, such as a video poster. */
  image?: { url: string; alt: string; width?: number; height?: number };
  type?: "website" | "article" | "video.other";
  /** A directly playable file, for social players that support og:video. */
  video?: { url: string; width?: number; height?: number };
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [image] : [DEFAULT_SOCIAL_IMAGE];
  const shared = {
    locale: "en_US",
    siteName: SITE_NAME,
    url,
    title,
    description,
    images,
  };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph:
      type === "article"
        ? { ...shared, type, publishedTime, modifiedTime }
        : type === "video.other"
          ? { ...shared, type, videos: video ? [video] : undefined }
          : { ...shared, type },
    twitter: {
      card: "summary_large_image",
      images: [image?.url ?? absoluteUrl("/twitter-image.jpg")],
      title,
      description,
    },
  };
}

// Entity IDs remain stable across pages, so all graphs describe the same site.
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/eizoki.webp"),
          width: 1265,
          height: 1243,
        },
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": absoluteUrl("/#organization") },
      },
    ],
  };
}

export function pageGraph(page: PublicPage) {
  return {
    "@context": "https://schema.org",
    "@type": page.schemaType,
    "@id": `${absoluteUrl(page.path)}#webpage`,
    url: absoluteUrl(page.path),
    name: page.title,
    description: page.description,
    inLanguage: "en",
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: { "@id": absoluteUrl("/#organization") },
  };
}

// Escaping '<' prevents creator-supplied text from closing a JSON-LD script.
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function videoPath(slug: string) {
  return `/v/${encodeURIComponent(slug)}`;
}

export function tagPath(tag: string) {
  return `/tag/${encodeURIComponent(tag)}`;
}

export function blogPostPath(slug: string) {
  return `/blog/${slug}`;
}

/** Breadcrumbs for search results, from the home page down to this URL. */
export function breadcrumbGraph(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** ISO 8601 duration ("PT1M5S") for schema.org VideoObject. */
export function isoDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return undefined;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `PT${minutes ? `${minutes}M` : ""}${rest || !minutes ? `${rest}S` : ""}`;
}

/** Plain text trimmed to a search-snippet length at a word boundary. */
export function snippet(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}
