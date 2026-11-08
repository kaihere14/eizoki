"use server";

import { refresh } from "next/cache";
import { ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/services/current-user";
import { approveVideo, rejectVideo } from "@/lib/services/video-review";

export type VideoReviewState = { error: string | null };

async function review(run: (reviewerId: string) => Promise<void>) {
  try {
    // Server actions are public endpoints: re-check admin on every call.
    const user = await requireUser();
    if (!user.isAdmin) throw new ApiError(403, "Only admins can review.");
    await run(user.id);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("Video review failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The change could not be saved. Please try again." };
  }
  // The feed reads Postgres directly, so only the queue needs re-rendering.
  refresh();
  return { error: null };
}

function idFrom(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string" || !id || id.length > 64) {
    throw new ApiError(400, "Missing video.");
  }
  return id;
}

export async function approveVideoAction(
  _state: VideoReviewState,
  form: FormData,
): Promise<VideoReviewState> {
  return review((reviewerId) => approveVideo(idFrom(form), reviewerId));
}

export async function rejectVideoAction(
  _state: VideoReviewState,
  form: FormData,
): Promise<VideoReviewState> {
  return review(async (reviewerId) => {
    const notes = form.get("notes");
    await rejectVideo(
      idFrom(form),
      typeof notes === "string" ? notes.slice(0, 2000) : undefined,
      reviewerId,
    );
  });
}
