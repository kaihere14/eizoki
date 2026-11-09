import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
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

/**
 * Values pasted into a hosting dashboard often carry a trailing newline or
 * wrapping quotes; either one breaks request signing with no obvious cause.
 */
function env(name: string) {
  return process.env[name]?.trim().replace(/^(["'])(.*)\1$/, "$2").trim() || undefined;
}

function config(): R2Config {
  if (cached) return cached;
  const accountId = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET_NAME");
  const publicUrl = env("R2_PUBLIC_URL")?.replace(/\/+$/, "");
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

/** R2's own error, without credentials, so a failure in production can be diagnosed. */
function describe(error: unknown) {
  if (error instanceof S3ServiceException) {
    return {
      name: error.name,
      status: error.$metadata.httpStatusCode,
      message: error.message,
    };
  }
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : undefined,
  };
}

function logFailure(operation: string, error: unknown) {
  console.error(`R2 ${operation} failed`, describe(error));
}

function providerError(action: string, operation?: string, error?: unknown): never {
  if (operation) logFailure(operation, error);
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
    providerError("upload", "CreateMultipartUpload", error);
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
    providerError("upload", "CompleteMultipartUpload", error);
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
    logFailure("AbortMultipartUpload", error);
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
    providerError("check", "HeadObject", error);
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
  } catch (error) {
    providerError("check", "GetObject", error);
  }
}

/** Store a small, server-generated object (a poster frame) in one request. */
export async function putR2Object(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = config();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are never reused for different bytes, so caches may keep them.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    logFailure("PutObject", error);
    throw error;
  }
}

/** Idempotent: R2 answers success for keys that are already gone. */
export async function deleteR2Object(key: string) {
  const { client, bucket } = config();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    logFailure("DeleteObject", error);
    throw error;
  }
}

/**
 * Enough of the configuration to compare against the dashboard, nothing more.
 * The account and access key IDs already appear in every presigned URL the
 * browser receives; the secret is reported by length only.
 */
export function r2ConfigFingerprint() {
  const clip = (value?: string) =>
    value ? `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)` : "missing";
  return {
    accountId: clip(env("R2_ACCOUNT_ID")),
    accessKeyId: clip(env("R2_ACCESS_KEY_ID")),
    secretAccessKey: `${env("R2_SECRET_ACCESS_KEY")?.length ?? 0} chars`,
    bucket: env("R2_BUCKET_NAME") ?? "missing",
  };
}

/**
 * Whether the server can reach the bucket with its configured credentials.
 * Reports R2's error name only (for example InvalidAccessKeyId), never values.
 */
export async function checkR2() {
  try {
    const { client, bucket } = config();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return "connected";
  } catch (error) {
    if (error instanceof ApiError) return "not configured";
    logFailure("HeadBucket", error);
    const { name, status, message } = describe(error);
    // HEAD replies carry no body, so R2 cannot name the problem itself.
    if (status === 403) return "error: access denied (403), check the R2 keys";
    if (status === 404) return "error: bucket not found (404), check R2_BUCKET_NAME";
    if (status) return `error: ${name} (${status})`;
    return `error: cannot reach R2 (${message?.slice(0, 80) ?? name}), check R2_ACCOUNT_ID`;
  }
}

/** Compensation is best-effort and must never replace the original failure. */
export async function cleanupR2Object(key: string) {
  try {
    await deleteR2Object(key);
  } catch {
    console.error("Orphaned R2 video requires cleanup", { key });
  }
}
