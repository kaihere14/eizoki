import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Analytics is optional. This module runs before hydration, so configuration
// or SDK failures must never prevent the rest of the application from starting.
if (token && host) {
  try {
    posthog.init(token, {
      api_host: host,
      defaults: "2026-08-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
  } catch {
    console.warn("PostHog initialization failed; analytics is disabled.");
  }
} else if (process.env.NODE_ENV === "development") {
  console.warn(
    "PostHog is disabled. Set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST to enable analytics.",
  );
}
