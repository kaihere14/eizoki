import type { VideoMetadata } from "@/lib/videos";

export type MyVideo = VideoMetadata & {
  reviewStatus: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  createdAt: string;
};
export type MyVideosPage = { videos: MyVideo[]; nextCursor: string | null };

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return new Error(
    typeof body?.error === "string"
      ? body.error
      : "The request could not be completed. Please try again.",
  );
}

export async function fetchMyVideos(
  signal?: AbortSignal,
  cursor?: string,
): Promise<MyVideosPage> {
  const query = new URLSearchParams({ limit: "24" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`/api/videos/mine?${query}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export async function removeMyVideo(id: string) {
  const response = await fetch(`/api/videos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await responseError(response);
}
