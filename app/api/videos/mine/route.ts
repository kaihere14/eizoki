import { apiErrorResponse } from "@/lib/api-error";
import { listMyVideos, myVideosQuerySchema } from "@/lib/services/my-videos";

export async function GET(request: Request) {
  const query = myVideosQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success)
    return Response.json(
      { error: "The video query is invalid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  try {
    return Response.json(await listMyVideos(query.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const response = apiErrorResponse(
      error,
      "Unable to load your videos. Please try again.",
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
