import { findPublicVideoReference } from "@/lib/services/video-reference";
import { deliveredVideoUrl } from "@/lib/services/media-url";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const video = await findPublicVideoReference(id);
    const url = video ? deliveredVideoUrl(video) : null;
    if (!url)
      return Response.json(
        { error: "Video not found." },
        { status: 404, headers: HEADERS },
      );
    return new Response(null, {
      status: 307,
      headers: { ...HEADERS, Location: url },
    });
  } catch {
    return Response.json(
      { error: "Unable to load the video reference." },
      { status: 500, headers: HEADERS },
    );
  }
}
