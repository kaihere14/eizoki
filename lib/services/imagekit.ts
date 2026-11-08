import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";

const uploadedAssetSchema = z.object({
  fileId: z.string().min(1),
  url: z.url().refine((value) => new URL(value).protocol === "https:"),
  duration: z.number().positive().optional(),
});

export type UploadedVideo = z.infer<typeof uploadedAssetSchema>;

function authorization() {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new ApiError(503, "Video uploads are not configured yet.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function uploadVideoToImageKit(
  file: File,
  extension: string,
): Promise<UploadedVideo> {
  const authHeader = authorization();
  const body = new FormData();
  body.set("file", file);
  body.set("fileName", `${randomUUID()}.${extension}`);
  body.set("folder", "/eizoki/videos");
  body.set("useUniqueFileName", "true");
  body.set("overwriteFile", "false");
  body.set("isPrivateFile", "false");
  let response: Response;
  try {
    response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError(
      502,
      "The video upload could not be completed. Please try again.",
    );
  }
  if (response.status !== 200 && response.status !== 201) {
    throw new ApiError(
      502,
      "ImageKit could not store the video. Please try again.",
    );
  }
  const raw: unknown = await response.json().catch(() => null);
  const result = uploadedAssetSchema.safeParse(raw);
  if (!result.success) {
    // If the provider allocated an asset, clean it up even on a malformed result.
    if (
      raw &&
      typeof raw === "object" &&
      "fileId" in raw &&
      typeof raw.fileId === "string"
    ) {
      await cleanupUploadedVideo(raw.fileId);
    }
    throw new ApiError(
      502,
      "ImageKit returned incomplete video details. Please try again.",
    );
  }
  return result.data;
}

export async function deleteImageKitFile(fileId: string) {
  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: authorization() },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok && response.status !== 404)
    throw new Error("ImageKit cleanup failed");
}

/** Compensation is best-effort and must never replace the original failure. */
export async function cleanupUploadedVideo(fileId: string) {
  try {
    await deleteImageKitFile(fileId);
  } catch {
    console.error("Orphaned ImageKit video requires cleanup", { fileId });
  }
}
