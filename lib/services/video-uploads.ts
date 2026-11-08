import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_LABEL,
  VIDEO_CONTENT_TYPES,
  VIDEO_PART_BYTES,
  isVideoContentType,
  type VideoContentType,
} from "@/lib/video-upload-limits";
import {
  abortMultipartUpload,
  cleanupR2Object,
  completeMultipartUpload,
  createMultipartUpload,
  headObject,
  r2PublicUrl,
  readObjectHeader,
  signUploadPart,
} from "./r2";
import { assertCanUpload } from "./upload-limits";

/** Where a finished upload is allowed to be used. */
export const UPLOAD_PURPOSES = ["video", "sponsor"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const KEY_PREFIX: Record<UploadPurpose, string> = {
  video: "videos",
  sponsor: "sponsors/videos",
};

/** Long enough for 500 MB on a slow connection, short enough to limit reuse. */
const PART_URL_SECONDS = 60 * 60;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const startUploadSchema = z.strictObject({
  purpose: z.enum(UPLOAD_PURPOSES),
  size: z.number().int().positive(),
  contentType: z.string(),
});

/** What the browser sends back after every part reached R2. */
export const uploadedVideoSchema = z.strictObject({
  key: z.string().min(1).max(300),
  uploadId: z.string().min(1).max(1024),
  parts: z
    .array(
      z.strictObject({
        partNumber: z.number().int().min(1).max(10_000),
        etag: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(10_000)
    .refine(
      (parts) => parts.every((part, index) => part.partNumber === index + 1),
      "Send every part once, in order.",
    ),
  /** Read by the browser from the file; display only, never trusted for billing. */
  durationSeconds: z.number().positive().max(24 * 60 * 60).optional(),
});

export type UploadedVideoInput = z.infer<typeof uploadedVideoSchema>;

export const abortUploadSchema = uploadedVideoSchema.pick({
  key: true,
  uploadId: true,
});

export type StoredVideo = {
  key: string;
  url: string;
  durationSeconds?: number;
};

function partCount(size: number) {
  return Math.ceil(size / VIDEO_PART_BYTES);
}

function assertSize(size: number) {
  if (size > MAX_VIDEO_BYTES) {
    throw new ApiError(413, `The video must be no larger than ${MAX_VIDEO_LABEL}.`);
  }
}

/**
 * Keys embed the owner, so a user can only finish or abort uploads they
 * started; the upload id alone is not treated as proof of ownership.
 */
function assertOwnedKey(key: string, purpose: UploadPurpose, userId: string) {
  const extensions = Object.values(VIDEO_CONTENT_TYPES).join("|");
  const pattern = new RegExp(
    `^${KEY_PREFIX[purpose]}/${escapeRegExp(userId)}/${UUID}\\.(?:${extensions})$`,
  );
  if (!pattern.test(key)) throw new ApiError(403, "That upload is not yours.");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Trust the bytes, not the browser-reported type. */
export function matchesVideoSignature(
  contentType: VideoContentType,
  header: Uint8Array,
) {
  if (contentType === "video/webm") {
    return (
      header[0] === 0x1a &&
      header[1] === 0x45 &&
      header[2] === 0xdf &&
      header[3] === 0xa3
    );
  }
  return new TextDecoder().decode(header.slice(4, 8)) === "ftyp";
}

/** Create the multipart upload and sign one PUT URL per part. */
export async function startVideoUpload(
  input: unknown,
  user: { id: string; isAdmin: boolean; uploadBanned: boolean },
) {
  const userId = user.id;
  const result = startUploadSchema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, "Describe the video with its purpose, size and type.");
  }
  const { purpose, size, contentType } = result.data;
  assertSize(size);
  if (!isVideoContentType(contentType)) {
    throw new ApiError(415, "Upload an MP4, MOV, or WebM video.");
  }
  // Checked before anything is created in R2.
  await assertCanUpload(user, purpose);

  const key = `${KEY_PREFIX[purpose]}/${userId}/${randomUUID()}.${VIDEO_CONTENT_TYPES[contentType]}`;
  const uploadId = await createMultipartUpload(key, contentType);
  const count = partCount(size);
  try {
    const urls = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        signUploadPart(key, uploadId, index + 1, PART_URL_SECONDS),
      ),
    );
    return {
      key,
      uploadId,
      partSize: VIDEO_PART_BYTES,
      parts: urls.map((url, index) => ({ partNumber: index + 1, url })),
    };
  } catch {
    await abortMultipartUpload(key, uploadId).catch(() => {});
    throw new ApiError(502, "The video upload could not be prepared. Please try again.");
  }
}

export async function abortVideoUpload(input: unknown, userId: string) {
  const result = abortUploadSchema.safeParse(input);
  if (!result.success) throw new ApiError(400, "Name the upload to cancel.");
  const { key, uploadId } = result.data;
  const purpose = UPLOAD_PURPOSES.find((p) => key.startsWith(`${KEY_PREFIX[p]}/`));
  if (!purpose) throw new ApiError(403, "That upload is not yours.");
  assertOwnedKey(key, purpose, userId);
  try {
    await abortMultipartUpload(key, uploadId);
  } catch {
    // R2 expires abandoned uploads on its own; cancelling is a courtesy.
    console.error("Abandoned R2 upload could not be aborted", { key });
  }
}

/** Parse the finished-upload reference that accompanies a submission. */
export function parseUploadedVideo(input: unknown) {
  const result = uploadedVideoSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(400, `upload.${issue.path.join(".")}: ${issue.message}`);
  }
  return result.data;
}

/**
 * Join the parts, then check the stored object really is a video of an
 * allowed size before anything references it. Invalid objects are deleted.
 * Call only after every other check on the request has passed, so a
 * rejected form leaves the parts in place for a retry.
 */
export async function finishVideoUpload(
  upload: UploadedVideoInput,
  purpose: UploadPurpose,
  userId: string,
): Promise<StoredVideo> {
  assertOwnedKey(upload.key, purpose, userId);
  assertSize((upload.parts.length - 1) * VIDEO_PART_BYTES + 1);

  const completed = await completeMultipartUpload(
    upload.key,
    upload.uploadId,
    upload.parts,
  );
  const object = await headObject(upload.key);
  if (!object) {
    throw new ApiError(
      410,
      completed
        ? "The uploaded video could not be found. Please upload it again."
        : "This upload expired or was cancelled. Please upload the video again.",
    );
  }

  try {
    assertSize(object.size);
    if (!object.size) throw new ApiError(400, "Choose a non-empty video file.");
    const contentType = object.contentType;
    if (!isVideoContentType(contentType)) {
      throw new ApiError(415, "Upload an MP4, MOV, or WebM video.");
    }
    const header = await readObjectHeader(upload.key, 12);
    if (!matchesVideoSignature(contentType, header)) {
      throw new ApiError(415, "The file contents do not match the video format.");
    }
  } catch (error) {
    await cleanupR2Object(upload.key);
    throw error;
  }

  return {
    key: upload.key,
    url: r2PublicUrl(upload.key),
    durationSeconds: upload.durationSeconds,
  };
}
