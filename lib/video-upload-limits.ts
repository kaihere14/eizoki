/** Videos upload straight to R2, so this is not bound by Vercel's body limit. */
export const MAX_VIDEO_BYTES = 500_000_000;
export const MAX_VIDEO_LABEL = "500 MB";

/**
 * Bytes per multipart part. R2 needs at least 5 MiB for every part but the
 * last, and all non-final parts must be the same size. 10 MiB keeps a 500 MB
 * upload at 48 parts, so a failed part is cheap to retry.
 */
export const VIDEO_PART_BYTES = 10 * 1024 * 1024;

export const VIDEO_CONTENT_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

export type VideoContentType = keyof typeof VIDEO_CONTENT_TYPES;

export function isVideoContentType(value: string): value is VideoContentType {
  return Object.hasOwn(VIDEO_CONTENT_TYPES, value);
}

/** Small multipart forms (sponsor booking fields plus a 2 MB icon). */
export const MAX_FORM_REQUEST_BYTES = 3_000_000;
