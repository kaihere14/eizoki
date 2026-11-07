import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eizoki — Premium AI Motion & Video Inspiration Library",
    short_name: "Eizoki",
    description:
      "A hand-curated visual discovery platform showcasing exceptional AI-generated videos, motion design, creative experiments, and product launch films.",
    start_url: "/",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#08080a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/eizoki.webp",
        sizes: "192x192 512x512",
        type: "image/webp",
      },
    ],
  };
}
