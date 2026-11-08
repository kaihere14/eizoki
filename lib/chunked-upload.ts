/**
 * Browser side of the direct-to-R2 multipart upload.
 *
 * 1. POST /api/uploads describes the file and gets one presigned URL per part.
 * 2. Each part is PUT straight to R2, a few at a time, with retries.
 * 3. The caller sends the returned reference with its form; the server then
 *    completes the upload (R2 joins the parts) and verifies the result.
 */

export type UploadPurpose = "video" | "sponsor";

/** An HTTP failure, keeping the status so callers can decide to re-upload. */
export class UploadRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Whether a finished upload is still worth reusing after the server rejected
 * the request. Form errors are raised before the upload is completed, so the
 * parts are still waiting in R2; anything else may have consumed or deleted it.
 */
export function uploadSurvives(error: unknown) {
  return (
    error instanceof UploadRequestError &&
    [400, 401, 403, 409, 422, 429].includes(error.status)
  );
}

export type FinishedUpload = {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
  durationSeconds?: number;
};

type StartedUpload = {
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
};

const PARALLEL_PARTS = 4;
const PART_ATTEMPTS = 4;

class PartError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function abortError() {
  return new DOMException("The upload was cancelled.", "AbortError");
}

export async function errorMessage(response: Response, fallback: string) {
  const result: unknown = await response.json().catch(() => null);
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

function putPart(
  url: string,
  body: Blob,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    // XHR, because fetch cannot report upload progress.
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const settle = () => signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      settle();
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (etag) return resolve(etag);
        // R2 always sends one; it is hidden when CORS does not expose it.
        return reject(
          new PartError(
            "Storage did not confirm the upload. Check the bucket CORS settings.",
            false,
          ),
        );
      }
      reject(
        new PartError(
          "Part of the video could not be uploaded.",
          xhr.status >= 500 || xhr.status === 429,
        ),
      );
    };
    xhr.onerror = () => {
      settle();
      reject(new PartError("The connection dropped while uploading.", true));
    };
    xhr.onabort = () => {
      settle();
      reject(abortError());
    };
    xhr.open("PUT", url);
    xhr.send(body);
  });
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

/** Tell the server to discard an unfinished upload. Never throws. */
export function cancelVideoUpload(upload: { key: string; uploadId: string }) {
  void fetch("/api/uploads/abort", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: upload.key, uploadId: upload.uploadId }),
    // Survives the page closing.
    keepalive: true,
  }).catch(() => {});
}

/** Duration from the file's own metadata; undefined when the browser can't read it. */
export function readVideoDuration(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value?: number) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(value && Number.isFinite(value) && value > 0 ? value : undefined);
    };
    const timer = setTimeout(() => done(), 5_000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done();
    video.src = url;
  });
}

export async function uploadVideoToStorage(
  file: File,
  purpose: UploadPurpose,
  options: {
    signal?: AbortSignal;
    onProgress?: (fraction: number) => void;
  } = {},
): Promise<FinishedUpload> {
  const { signal, onProgress } = options;
  const durationPromise = readVideoDuration(file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose, size: file.size, contentType: file.type }),
    signal,
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "The upload could not start. Please try again."),
    );
  }
  const { upload } = (await response.json()) as { upload: StartedUpload };

  const loaded = new Array<number>(upload.parts.length).fill(0);
  const report = () =>
    onProgress?.(
      Math.min(1, loaded.reduce((sum, value) => sum + value, 0) / file.size),
    );
  const etags = new Array<string>(upload.parts.length);
  let next = 0;

  // Stop the other workers as soon as one part fails for good.
  const stop = new AbortController();
  const stopOnCancel = () => stop.abort();
  signal?.addEventListener("abort", stopOnCancel, { once: true });

  async function worker() {
    while (next < upload.parts.length) {
      const index = next++;
      const { url, partNumber } = upload.parts[index];
      const start = (partNumber - 1) * upload.partSize;
      const body = file.slice(start, Math.min(start + upload.partSize, file.size));
      for (let attempt = 1; ; attempt++) {
        try {
          etags[index] = await putPart(url, body, stop.signal, (bytes) => {
            loaded[index] = bytes;
            report();
          });
          loaded[index] = body.size;
          report();
          break;
        } catch (error) {
          loaded[index] = 0;
          report();
          const retryable = error instanceof PartError && error.retryable;
          if (!retryable || attempt >= PART_ATTEMPTS) throw error;
          await wait(1_000 * 2 ** (attempt - 1), stop.signal);
        }
      }
    }
  }

  try {
    const workers = Array.from(
      { length: Math.min(PARALLEL_PARTS, upload.parts.length) },
      () =>
        worker().catch((error) => {
          stop.abort();
          throw error;
        }),
    );
    const results = await Promise.allSettled(workers);
    // Report the first real failure, not the aborts it caused.
    const failure =
      results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason as unknown)
        .find((reason) => !(reason instanceof DOMException)) ??
      results.find((result) => result.status === "rejected")?.reason;
    if (failure) throw failure;
  } catch (error) {
    cancelVideoUpload(upload);
    if (signal?.aborted) throw abortError();
    throw error instanceof Error
      ? error
      : new Error("The video could not be uploaded. Please try again.");
  } finally {
    signal?.removeEventListener("abort", stopOnCancel);
  }

  return {
    key: upload.key,
    uploadId: upload.uploadId,
    parts: etags.map((etag, index) => ({ partNumber: index + 1, etag })),
    durationSeconds: await durationPromise,
  };
}
