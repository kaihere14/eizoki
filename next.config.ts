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
