import type { NextConfig } from "next";
import { MAX_VIDEO_REQUEST_BYTES } from "./lib/video-upload-limits";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Proxy otherwise truncates multipart requests at its default 10 MB limit.
    proxyClientMaxBodySize: MAX_VIDEO_REQUEST_BYTES,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  async redirects() {
    return [
      // /admin is the review area; videos is the default queue.
      { source: "/admin", destination: "/admin/videos", permanent: false },
      // The sponsorship queue moved; keep old links working.
      {
        source: "/admin/sponsorship",
        destination: "/admin/sponsorships",
        permanent: true,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
