import type { Metadata } from "next";

export const SITE_URL = "https://www.eizoki.xyz";
export const SITE_NAME = "Eizoki";
export const HOME_TITLE = "Eizoki — AI Video & Motion Design Inspiration";
export const SITE_DESCRIPTION =
  "Discover hand-curated AI videos, motion design, product launch films and creative experiments, with creator credits and prompts when available.";

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

type PublicPage = {
  path: "/" | "/info" | "/sponsor";
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
} as const satisfies Record<string, PublicPage>;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function pageMetadata(page: PublicPage): Metadata {
  const title = page.path === "/" ? page.title : `${page.title} | ${SITE_NAME}`;
  return {
    title: { absolute: title },
    description: page.description,
    alternates: { canonical: absoluteUrl(page.path) },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: absoluteUrl(page.path),
      title,
      description: page.description,
      images: [{
        url: absoluteUrl("/opengraph-image.jpg"),
        width: 1200,
        height: 630,
        alt: "Eizoki — AI video and motion design inspiration",
      }],
    },
    twitter: {
      card: "summary_large_image",
      images: [absoluteUrl("/twitter-image.jpg")],
      title,
      description: page.description,
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
