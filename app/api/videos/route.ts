import { logVideoSubmissionCreated } from "@/instrumentation";
import { submissionErrorResponse } from "@/lib/api-error";
import { createVideoSubmission } from "@/lib/services/video-submissions";
import { invalidatePublicVideos } from "@/lib/services/public-videos";

// The feed moved to /api/feed. Keep GET here for pages still open on an
// older deploy.
export { GET } from "@/app/api/feed/route";

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
