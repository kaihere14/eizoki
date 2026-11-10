import { apiErrorResponse } from "@/lib/api-error";
import { deleteMyVideo } from "@/lib/services/my-videos";
import { invalidatePublicVideos } from "@/lib/services/public-videos";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await deleteMyVideo((await context.params).id);
    invalidatePublicVideos();
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Unable to delete the video. Please try again.",
    );
  }
}
