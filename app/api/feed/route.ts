import { getLiveFeedSponsor } from "@/lib/services/sponsorships";
import {
  listPublicVideos,
  videoFeedQuerySchema,
} from "@/lib/services/video-feed";

// The public feed, page by page. It lives apart from POST /api/videos so the
// proxy can skip Clerk here: this route reads no session, and without the
// proxy a CDN hit costs no compute at all.

const FEED_HEADERS = {
  // The catalogue changes rarely. Browsers reuse a page for 30 seconds and
  // the Vercel CDN for 5 minutes (s-maxage), so repeat requests for the same
  // page skip the function. A newly approved video can take that long to
  // appear in later pages; the prerendered pages refresh at once.
  "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
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
