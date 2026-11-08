import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "@/lib/api-error";

/**
 * Cloudflare R2 through its S3-compatible API. Videos never pass through a
 * Vercel function: the server only creates the multipart upload, signs one
 * URL per part, and completes it. The browser PUTs each part straight to R2.
 */
type R2Config = {
  client: S3Client;
  bucket: string;
  publicUrl: string;
};

let cached: R2Config | null = null;

function config(): R2Config {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new ApiError(503, "Uploads are not configured yet.");
  }
  cached = {
    bucket,
    publicUrl,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // Path-style URLs keep TLS valid for bucket names containing dots.
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      // Newer SDKs add CRC32 checksums by default. R2 accepts them on direct
      // calls, but a checksum baked into a presigned part URL cannot match
      // bytes the browser sends later, so only send them when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return cached;
}

/** Only for tests: drop the memoised client after changing env vars. */
export function resetR2ConfigForTests() {
  cached = null;
}

export function r2PublicUrl(key: string) {
  return `${config().publicUrl}/${key}`;
}

function providerError(action: string): never {
  throw new ApiError(502, `The video ${action} could not be completed. Please try again.`);
}

function errorName(error: unknown) {
  return error instanceof S3ServiceException ? error.name : undefined;
}

export async function createMultipartUpload(key: string, contentType: string) {
  const { client, bucket } = config();
  try {
    const result = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        // Uploaded videos are immutable; every upload gets a fresh key.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    if (!result.UploadId) providerError("upload");
    return result.UploadId;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    providerError("upload");
  }
}

export function signUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number,
) {
  const { client, bucket } = config();
  return getSignedUrl(
    client,
    new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn },
  );
}

export type CompletedPart = { partNumber: number; etag: string };

/**
 * Join the parts into one object. Returns false when R2 no longer knows the
 * upload: it was already completed (a retried request) or aborted/expired.
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[],
) {
  const { client, bucket } = config();
  try {
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
        },
      }),
    );
    return true;
  } catch (error) {
    const name = errorName(error);
    if (name === "NoSuchUpload") return false;
    if (name === "InvalidPart" || name === "InvalidPartOrder" || name === "EntityTooSmall") {
      throw new ApiError(
        400,
        "Some parts of the video did not arrive. Please upload it again.",
      );
    }
    providerError("upload");
  }
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  const { client, bucket } = config();
  try {
    await client.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
    );
  } catch (error) {
    // Already completed, aborted or expired: nothing left to clean up.
    if (errorName(error) === "NoSuchUpload") return;
    throw error;
  }
}

/** Size and type of a stored object, or null when it does not exist. */
export async function headObject(key: string) {
  const { client, bucket } = config();
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? "",
    };
  } catch (error) {
    const name = errorName(error);
    if (name === "NotFound" || name === "NoSuchKey") return null;
    providerError("check");
  }
}

/** The first bytes of an object, to verify its format signature. */
export async function readObjectHeader(key: string, bytes: number) {
  const { client, bucket } = config();
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${bytes - 1}`,
      }),
    );
    return result.Body
      ? new Uint8Array(await result.Body.transformToByteArray())
      : new Uint8Array();
  } catch {
    providerError("check");
  }
}

/** Idempotent: R2 answers success for keys that are already gone. */
export async function deleteR2Object(key: string) {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Compensation is best-effort and must never replace the original failure. */
export async function cleanupR2Object(key: string) {
  try {
    await deleteR2Object(key);
  } catch {
    console.error("Orphaned R2 video requires cleanup", { key });
  }
}
