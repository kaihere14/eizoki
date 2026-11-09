import { MAX_POSTER_BYTES, POSTER_WIDTH } from "@/lib/video-upload-limits";

/** Give up rather than hold the submission; the poster is optional. */
const CAPTURE_TIMEOUT_MS = 8_000;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

function base64Of(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Resolve on `event`, reject if the element reports an error first. */
function once(target: HTMLVideoElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      target.removeEventListener(event, done);
      target.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      target.removeEventListener(event, done);
      target.removeEventListener("error", fail);
      reject(new Error("The video could not be decoded."));
    };
    target.addEventListener(event, done);
    target.addEventListener("error", fail);
  });
}

/**
 * Capture one still frame from a local video file, as base64 WebP (JPEG where
 * the browser cannot encode WebP), at most POSTER_WIDTH wide.
 *
 * Runs in the uploader's browser, which already holds the file, so posters
 * cost no server compute. Resolves undefined when the browser cannot decode
 * the file (for example HEVC in some browsers); the server re-encodes
 * whatever arrives, so this output is a convenience, not a trust boundary.
 */
export async function captureVideoPoster(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const loaded = once(video, "loadeddata");
    video.src = url;
    const capture = (async () => {
      await loaded;
      // Skip the very first frame: generated clips often open on black or a
      // fade. A quarter of the way in, capped at one second, is representative.
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = Math.min(1, duration / 4);
      if (target > 0.05) {
        const seeked = once(video, "seeked");
        video.currentTime = target;
        await seeked;
      }
      const width = Math.min(POSTER_WIDTH, video.videoWidth);
      const height = Math.round((video.videoHeight / video.videoWidth) * width);
      if (!width || !height) return undefined;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
      let blob = await canvasBlob(canvas, "image/webp", 0.8);
      // Older Safari ignores the WebP request and returns a large PNG.
      if (!blob || blob.type !== "image/webp") {
        blob = await canvasBlob(canvas, "image/jpeg", 0.82);
      }
      if (!blob || blob.size > MAX_POSTER_BYTES) return undefined;
      return base64Of(blob);
    })().catch(() => undefined); // After a timeout, the cleanup aborts it.
    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), CAPTURE_TIMEOUT_MS);
    });
    return await Promise.race([capture, timeout]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
