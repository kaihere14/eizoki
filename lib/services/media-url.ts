import { playableVideoUrl } from "@/lib/video-delivery";

/**
 * Public URLs for R2 objects are built when a row is read, from the object key
 * and R2_PUBLIC_URL, instead of being trusted from the stored URL. Moving the
 * bucket to another public domain (for example from `r2.dev` to a cached
 * custom domain) is then a change to one environment variable: every existing
 * video and poster follows it without a data migration.
 */
function publicBase() {
  const value = process.env.R2_PUBLIC_URL?.trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim()
    .replace(/\/+$/, "");
  return value || undefined;
}

/** The public URL of an R2 object, or undefined when no public domain is set. */
export function r2ObjectUrl(key: string) {
  const base = publicBase();
  return base ? `${base}/${key}` : undefined;
}

/**
 * Where the browser should fetch a video file. R2 objects use the current
 * public domain; ImageKit files keep their stored URL. Null only when the
 * file was deleted (a rejected video).
 */
export function deliveredVideoUrl(file: {
  videoUrl: string | null;
  storageKey?: string | null;
}) {
  if (file.storageKey) {
    const url = r2ObjectUrl(file.storageKey);
    if (url) return url;
  }
  return file.videoUrl ? playableVideoUrl(file.videoUrl) : null;
}
