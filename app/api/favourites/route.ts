import { apiErrorResponse } from "@/lib/api-error";
import {
  favouritesQuerySchema,
  listFavouriteVideos,
} from "@/lib/services/favourites";

export async function GET(request: Request) {
  const query = favouritesQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success)
    return Response.json(
      { error: "The favourites query is invalid." },
      { status: 400 },
    );

  try {
    return Response.json(await listFavouriteVideos(query.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "The favourites cursor is no longer valid. Reload the page." },
        { status: 400 },
      );
    }

    const response = apiErrorResponse(
      error,
      "Unable to load your favourites. Please try again.",
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
