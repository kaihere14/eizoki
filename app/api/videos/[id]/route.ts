import { apiErrorResponse } from "@/lib/api-error";
import { deleteMyVideo } from "@/lib/services/my-videos";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await deleteMyVideo((await context.params).id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Unable to delete the video. Please try again.",
    );
  }
}
