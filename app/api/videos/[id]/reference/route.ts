import { findPublicVideoReference } from "@/lib/services/video-reference";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const video = await findPublicVideoReference(id);
    if (!video)
      return Response.json(
        { error: "Video not found." },
        { status: 404, headers: HEADERS },
      );
    return new Response(null, {
      status: 307,
      headers: { ...HEADERS, Location: video.videoUrl },
    });
  } catch {
    return Response.json(
      { error: "Unable to load the video reference." },
      { status: 500, headers: HEADERS },
    );
  }
}
