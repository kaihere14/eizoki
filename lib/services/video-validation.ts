import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { CATEGORY_LABELS } from "@/lib/videos";
import { MAX_VIDEO_TAGS, VIDEO_TAG_VALUES } from "@/lib/video-tags";
import { MAX_FORM_REQUEST_BYTES } from "@/lib/video-upload-limits";
import { parseUploadedVideo } from "./video-uploads";

/** Metadata plus the finished-upload reference; the video itself never comes here. */
const MAX_SUBMISSION_JSON_BYTES = 1_000_000;

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

/** Read the stream with a byte cap, so Content-Length cannot be spoofed. */
async function readBoundedBody(
  request: Request,
  maxBytes: number,
  tooLarge: string,
) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new ApiError(413, tooLarge);
  }
  if (!request.body) throw new ApiError(400, "The request body is missing.");
  let bytes = 0;
  let exceededLimit = false;
  const bounded = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) {
          exceededLimit = true;
          throw new ApiError(413, tooLarge);
        }
        controller.enqueue(chunk);
      },
    }),
  );
  return { bounded, exceeded: () => exceededLimit };
}

/** Small multipart forms only (sponsor fields and a 2 MB icon). */
export async function readSubmissionForm(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "Send multipart form data.");
  }
  const tooLarge = "The form is too large. Videos upload separately.";
  const { bounded, exceeded } = await readBoundedBody(
    request,
    MAX_FORM_REQUEST_BYTES,
    tooLarge,
  );
  try {
    return await new Response(bounded, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    if (exceeded()) throw new ApiError(413, tooLarge);
    throw new ApiError(400, "The multipart submission is malformed.");
  }
}

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "Send a JSON body.");
  }
  const tooLarge = "The request is too large.";
  const { bounded, exceeded } = await readBoundedBody(
    request,
    MAX_SUBMISSION_JSON_BYTES,
    tooLarge,
  );
  let text: string;
  try {
    text = await new Response(bounded).text();
  } catch {
    if (exceeded()) throw new ApiError(413, tooLarge);
    throw new ApiError(400, "The request body could not be read.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "Send valid JSON.");
  }
}

/**
 * A submission is JSON: `{ metadata, upload }`. The video already sits in R2
 * as an unfinished multipart upload; `upload` names it and lists its parts.
 */
export async function parseVideoSubmission(request: Request, isAdmin: boolean) {
  const body = await readJsonBody(request);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["metadata", "upload"].includes(key)) ||
    !("metadata" in body) ||
    !("upload" in body)
  ) {
    throw new ApiError(400, "Provide exactly one metadata and one upload field.");
  }
  const result = videoMetadataSchema.safeParse(body.metadata);
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
  return { metadata: result.data, upload: parseUploadedVideo(body.upload) };
}
