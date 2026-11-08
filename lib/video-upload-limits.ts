export const MAX_VIDEO_BYTES = 100_000_000;
// Allow multipart framing and metadata in addition to the video itself.
export const MAX_VIDEO_REQUEST_BYTES = MAX_VIDEO_BYTES + 128_000;
