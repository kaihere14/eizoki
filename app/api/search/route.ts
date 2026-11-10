import {
  searchPublicVideos,
  videoSearchQuerySchema,
} from "@/lib/services/video-search";

const SEARCH_HEADERS = {
  // Results only change when a video is published or taken down, so repeated
  // keystrokes for the same query can reuse a recent answer.
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = videoSearchQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return Response.json(
      { error: "The search query is invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await searchPublicVideos(parsed.data);
    return Response.json(result, { headers: SEARCH_HEADERS });
  } catch (error) {
    console.error("Video search failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Search is unavailable right now. Please try again." },
      { status: 500 },
    );
  }
}
