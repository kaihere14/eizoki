import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/services/current-user";
import { startVideoUpload } from "@/lib/services/video-uploads";
import { readJsonBody } from "@/lib/services/video-validation";

/**
 * Start a direct-to-R2 multipart upload. Returns one presigned PUT URL per
 * part; the browser sends the bytes to R2, never through this function.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser("Sign in to upload a video.");
    const upload = await startVideoUpload(await readJsonBody(request), user);
    return Response.json({ upload }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to start the upload. Please try again.");
  }
}
