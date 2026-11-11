import { logVideoSubmissionCreated } from "@/instrumentation";
import { submissionErrorResponse } from "@/lib/api-error";
import { createVideoSubmission } from "@/lib/services/video-submissions";
import { getLiveFeedSponsor } from "@/lib/services/sponsorships";
import { invalidatePublicVideos } from "@/lib/services/public-videos";
import {
  listPublicVideos,
  videoFeedQuerySchema,
} from "@/lib/services/video-feed";

const FEED_HEADERS = {
  // The catalogue changes rarely; let the browser reuse a page briefly while
  // revalidating in the background after a publish.
  "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = videoFeedQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return Response.json(
      { error: "The feed query is invalid." },
      { status: 400 },
    );
  }

  try {
    const [page, sponsor] = await Promise.all([
      listPublicVideos(parsed.data),
      // The sponsored card is pinned once, in the first page only.
      parsed.data.cursor ? null : getLiveFeedSponsor(),
    ]);
    return Response.json(
      { ...page, sponsor },
      { headers: FEED_HEADERS },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "The feed cursor is no longer valid. Reload the feed." },
        { status: 400 },
      );
    }

    console.error("Video feed failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Unable to load videos. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const video = await createVideoSubmission(request);
    // Admin submissions publish straight away.
    if (video.reviewStatus === "APPROVED") invalidatePublicVideos();
    await logVideoSubmissionCreated(video.reviewStatus);
    return Response.json({ video }, { status: 201 });
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
