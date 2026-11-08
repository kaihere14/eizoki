import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { CATEGORY_LABELS } from "@/lib/videos";
import { MAX_VIDEO_TAGS, VIDEO_TAG_VALUES } from "@/lib/video-tags";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_REQUEST_BYTES,
} from "@/lib/video-upload-limits";

export { MAX_VIDEO_BYTES } from "@/lib/video-upload-limits";
const MIME_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalUrl = z
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.")
  .optional();
const stringList = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .default([]);

export const videoMetadataSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    description: optionalText(5000),
    category: z.enum(Object.keys(CATEGORY_LABELS) as [string, ...string[]]),
    tags: z
      .array(z.enum(VIDEO_TAG_VALUES))
      .max(MAX_VIDEO_TAGS)
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Choose each tag only once.",
      )
      .default([]),
    creatorName: z.string().trim().min(1).max(200),
    creatorUsername: optionalText(100),
    creatorXUrl: optionalUrl.refine(
      (value) =>
        !value ||
        ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
          new URL(value).hostname,
        ),
      "Use an X profile URL.",
    ),
    creatorProfileUrl: optionalUrl,
    sourceUrl: optionalUrl,
    promptStatus: z
      .enum(["ORIGINAL", "RECONSTRUCTED", "UNAVAILABLE"])
      .default("UNAVAILABLE"),
    // Validate content without trimming the original prompt.
    promptText: z.string().max(30_000).optional(),
    negativePrompt: z.string().max(10_000).optional(),
    toolsUsed: stringList,
    curatorNotes: optionalText(5000),
    isFeatured: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const hasPrompt = Boolean(value.promptText?.trim());
    if (value.promptStatus !== "UNAVAILABLE" && !hasPrompt) {
      ctx.addIssue({
        code: "custom",
        path: ["promptText"],
        message: "A shared prompt requires prompt text.",
      });
    }
    if (
      value.promptStatus === "UNAVAILABLE" &&
      (hasPrompt || value.negativePrompt?.trim())
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["promptStatus"],
        message: "Choose ORIGINAL or RECONSTRUCTED when sharing a prompt.",
      });
    }
  });

export type VideoSubmissionMetadata = z.infer<typeof videoMetadataSchema>;

/** Bound the stream as well as Content-Length before buffering multipart data. */
export async function readSubmissionForm(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(
      415,
      "Send multipart form data with file and metadata fields.",
    );
  }
  if (Number(request.headers.get("content-length")) > MAX_VIDEO_REQUEST_BYTES) {
    throw new ApiError(413, "The video must be no larger than 100 MB.");
  }
  if (!request.body) throw new ApiError(400, "The submission body is missing.");

  let bytes = 0;
  let exceededLimit = false;
  const boundedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > MAX_VIDEO_REQUEST_BYTES) {
          exceededLimit = true;
          throw new ApiError(413, "The video must be no larger than 100 MB.");
        }
        controller.enqueue(chunk);
      },
    }),
  );

  try {
    return await new Response(boundedBody, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    if (exceededLimit)
      throw new ApiError(413, "The video must be no larger than 100 MB.");
    throw new ApiError(400, "The multipart submission is malformed.");
  }
}

export async function validateVideoFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, "Choose a non-empty video file.");
  }
  if (file.size > MAX_VIDEO_BYTES)
    throw new ApiError(413, "The video must be no larger than 100 MB.");
  if (!Object.hasOwn(MIME_EXTENSIONS, file.type))
    throw new ApiError(415, "Upload an MP4, MOV, or WebM video.");

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isWebM =
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3;
  const isIsoMedia = new TextDecoder().decode(header.slice(4, 8)) === "ftyp";
  if (file.type === "video/webm" ? !isWebM : !isIsoMedia) {
    throw new ApiError(415, "The file contents do not match the video format.");
  }
  return {
    file,
    extension: MIME_EXTENSIONS[file.type as keyof typeof MIME_EXTENSIONS],
  };
}

export async function parseVideoSubmission(request: Request, isAdmin: boolean) {
  const form = await readSubmissionForm(request);
  if (
    [...form.keys()].some((key) => !["file", "metadata"].includes(key)) ||
    form.getAll("file").length !== 1 ||
    form.getAll("metadata").length !== 1
  ) {
    throw new ApiError(400, "Provide exactly one file and one metadata field.");
  }
  const rawMetadata = form.get("metadata");
  if (typeof rawMetadata !== "string" || rawMetadata.length > 64_000) {
    throw new ApiError(
      400,
      "Provide metadata as a JSON object of at most 64,000 characters.",
    );
  }
  let input: unknown;
  try {
    input = JSON.parse(rawMetadata);
  } catch {
    throw new ApiError(400, "Metadata must be valid JSON.");
  }
  const result = videoMetadataSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(
      400,
      `${issue.path.join(".") || "metadata"}: ${issue.message}`,
    );
  }
  if (
    !isAdmin &&
    (result.data.isFeatured || result.data.curatorNotes !== undefined)
  ) {
    throw new ApiError(
      403,
      "Only admins can feature videos or add curator notes.",
    );
  }
  return {
    ...(await validateVideoFile(form.get("file"))),
    metadata: result.data,
  };
}
