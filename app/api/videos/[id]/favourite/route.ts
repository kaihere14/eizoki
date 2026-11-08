import { apiErrorResponse } from "@/lib/api-error";
import {
  addFavourite,
  isVideoFavourited,
  removeFavourite,
} from "@/lib/services/favourites";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const favourited = await isVideoFavourited((await context.params).id);
    return Response.json({ favourited }, { headers: NO_STORE });
  } catch (error) {
    const response = apiErrorResponse(
      error,
      "Unable to check your favourites. Please try again.",
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await addFavourite((await context.params).id);
    return Response.json({ favourited: true }, { headers: NO_STORE });
  } catch (error) {
    return apiErrorResponse(error, "Unable to save this video. Please try again.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await removeFavourite((await context.params).id);
    return Response.json({ favourited: false }, { headers: NO_STORE });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Unable to remove this video from your favourites. Please try again.",
    );
  }
}
