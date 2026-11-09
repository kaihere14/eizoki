import type { VideoFeedPage } from "@/lib/video-feed";
import { connection } from "next/server";
import { VideoFeed } from "@/components/video-feed";
import { listPublicVideos } from "@/lib/services/video-feed";
import { getLiveFeedSponsor } from "@/lib/services/sponsorships";

/** Share the API's publication rules and sponsorship logic with server rendering. */
export async function PublicVideoFeed() {
  await connection();
  let initialPage: VideoFeedPage | undefined;
  try {
    const [page, sponsor] = await Promise.all([
      listPublicVideos({ limit: 24 }),
      getLiveFeedSponsor(),
    ]);
    initialPage = { ...page, sponsor };
  } catch (error) {
    console.error("Server video feed failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    // Preserve the existing retry UI if the database is temporarily unavailable.
  }
  return <VideoFeed initialPage={initialPage} />;
}
