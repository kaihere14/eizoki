import sharp from "sharp";
import { POSTER_WIDTH } from "@/lib/video-upload-limits";
import { cleanupR2Object, putR2Object } from "./r2";

/**
 * Poster frames: one still image per video, shown in the feed the moment the
 * card appears, while the video itself loads behind it.
 *
 * The uploader's browser captures the frame (it already has the file, so this
 * costs no server compute) and sends it with the submission. The server never
 * stores those bytes as they are: sharp decodes them and writes a fresh WebP,
 * so whatever the client sent, only a real, bounded image reaches the bucket.
 */

/** A video key `videos/<user>/<uuid>.mp4` gets `videos/<user>/<uuid>.poster.webp`. */
export function posterKeyFor(videoKey: string) {
  return `${videoKey.replace(/\.[^./]+$/, "")}.poster.webp`;
}

/** Any image sharp can read, as a POSTER_WIDTH WebP plus the frame's ratio. */
export async function encodePoster(input: Uint8Array) {
  const { data, info } = await sharp(input, {
    limitInputPixels: 8192 * 8192,
    animated: false,
  })
    .rotate()
    .resize({ width: POSTER_WIDTH, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer({ resolveWithObject: true });
  if (!info.width || !info.height) throw new Error("The poster has no size.");
  return { data, aspectRatio: info.width / info.height };
}

/** Ratios outside this range are treated as unknown rather than trusted. */
function plausibleRatio(ratio: number) {
  return Number.isFinite(ratio) && ratio >= 0.2 && ratio <= 5 ? ratio : null;
}

/**
 * Re-encode and store the poster for a stored video. Never throws: a missing
 * poster only means the card shows its shimmer until the video loads, so it
 * must not cost the uploader their submission.
 */
export async function storeVideoPoster(videoKey: string, base64?: string) {
  if (!base64) return null;
  try {
    const { data, aspectRatio } = await encodePoster(Buffer.from(base64, "base64"));
    const key = posterKeyFor(videoKey);
    await putR2Object(key, data, "image/webp");
    return { posterKey: key, aspectRatio: plausibleRatio(aspectRatio) };
  } catch (error) {
    console.error("Video poster could not be stored", {
      videoKey,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

/** Best-effort removal next to the video's own cleanup. */
export async function cleanupPoster(posterKey: string | null | undefined) {
  if (posterKey) await cleanupR2Object(posterKey);
}
