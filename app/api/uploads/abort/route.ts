import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/services/current-user";
import { abortVideoUpload } from "@/lib/services/video-uploads";
import { readJsonBody } from "@/lib/services/video-validation";

/** Discard the parts of an upload the user cancelled or replaced. */
export async function POST(request: Request) {
  try {
    const user = await requireUser("Sign in to cancel an upload.");
    await abortVideoUpload(await readJsonBody(request), user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to cancel the upload.");
  }
}
