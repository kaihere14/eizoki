"use server";

import { updateTag } from "next/cache";
import { ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/services/current-user";
import {
  approveSponsorship,
  cancelSponsorship,
  rejectSponsorship,
  SPONSORSHIP_CACHE_TAG,
} from "@/lib/services/sponsorships";

export type ReviewState = { error: string | null };

async function review(run: (reviewerId: string) => Promise<void>) {
  try {
    // Server actions are public endpoints: re-check admin on every call.
    const user = await requireUser();
    if (!user.isAdmin) throw new ApiError(403, "Only admins can review.");
    await run(user.id);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("Sponsorship review failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The change could not be saved. Please try again." };
  }
  // Expire the cached navbar and feed sponsors immediately.
  updateTag(SPONSORSHIP_CACHE_TAG);
  return { error: null };
}

function idFrom(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string" || !id || id.length > 64) {
    throw new ApiError(400, "Missing sponsorship.");
  }
  return id;
}

export async function approveAction(
  _state: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  return review(async (reviewerId) => {
    const raw = form.get("startsAt");
    if (typeof raw !== "string") throw new ApiError(400, "Choose a start date.");
    const requested = new Date(raw);
    // A start in the past means "now": the month is never silently shortened.
    const now = new Date();
    const startsAt = requested < now ? now : requested;
    await approveSponsorship(idFrom(form), startsAt, reviewerId);
  });
}

export async function rejectAction(
  _state: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  return review(async (reviewerId) => {
    const notes = form.get("notes");
    await rejectSponsorship(
      idFrom(form),
      typeof notes === "string" ? notes.slice(0, 2000) : undefined,
      reviewerId,
    );
  });
}

export async function cancelAction(
  _state: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  return review((reviewerId) => cancelSponsorship(idFrom(form), reviewerId));
}
