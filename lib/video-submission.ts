import type { VideoSubmissionMetadata } from "@/lib/services/video-validation";
import { isVideoTag } from "@/lib/video-tags";

export type VideoSubmissionReceipt = {
  id: string;
  slug: string;
  title: string;
  reviewStatus: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  publishedAt: string | null;
  createdAt: string;
};

/** Accept a handle or profile link while keeping one canonical X URL. */
export function creatorXProfile(value: string) {
  if (!value.trim()) return {};
  const match = value
    .trim()
    .match(
      /^(?:https:\/\/)?(?:www\.)?(?:x\.com\/|twitter\.com\/)?@?([a-zA-Z0-9_]{1,15})\/?$/,
    );
  if (!match)
    throw new Error(
      "Enter an X username or a link to the creator’s X profile.",
    );
  return {
    creatorUsername: `@${match[1]}`,
    creatorXUrl: `https://x.com/${match[1]}`,
  };
}

export function submissionMetadata(
  form: FormData,
  isAdmin: boolean,
): VideoSubmissionMetadata {
  const text = (name: string) => String(form.get(name) ?? "");
  const promptText = text("promptText");
  const hasPrompt = Boolean(promptText.trim());
  const toolsUsed = [
    ...new Set(
      text("toolsUsed")
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean),
    ),
  ];
  return {
    title: text("title").trim(),
    category: text("category"),
    creatorName: text("creatorName").trim(),
    ...creatorXProfile(text("creatorX")),
    sourceUrl: text("sourceUrl").trim() || undefined,
    promptStatus: hasPrompt
      ? text("promptStatus") === "RECONSTRUCTED"
        ? "RECONSTRUCTED"
        : "ORIGINAL"
      : "UNAVAILABLE",
    promptText: hasPrompt ? promptText : undefined,
    negativePrompt: hasPrompt ? text("negativePrompt") || undefined : undefined,
    tags: form.getAll("tags").filter(isVideoTag),
    toolsUsed,
    isFeatured: isAdmin && form.get("isFeatured") === "on",
    ...(isAdmin && text("curatorNotes").trim()
      ? { curatorNotes: text("curatorNotes").trim() }
      : {}),
  };
}

export async function sendVideoSubmission(
  file: File,
  metadata: VideoSubmissionMetadata,
): Promise<VideoSubmissionReceipt> {
  const body = new FormData();
  body.set("file", file);
  body.set("metadata", JSON.stringify(metadata));
  const response = await fetch("/api/videos", { method: "POST", body });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Your video could not be submitted. Please try again.",
    );
  }
  if (!result?.video?.id)
    throw new Error(
      "The server did not confirm your submission. Please check before trying again.",
    );
  return result.video;
}
