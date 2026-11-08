/**
 * ImageKit re-encodes videos on delivery by default, and every re-encode
 * counts against the plan's monthly video-processing quota. Once that quota
 * runs out the default URL answers 403 ("Video transformations limit
 * exceeded") and nothing plays. `tr=orig-true` serves the uploaded file as is,
 * which needs no processing, so playback never depends on the quota.
 *
 * Stored URLs stay untouched; this is applied wherever a URL leaves the server.
 */
export function playableVideoUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "ik.imagekit.io" || parsed.searchParams.has("tr")) {
    return url;
  }
  parsed.searchParams.set("tr", "orig-true");
  return parsed.toString();
}
