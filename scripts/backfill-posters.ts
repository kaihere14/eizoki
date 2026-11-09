/**
 * Give existing videos a poster frame. New uploads get one from the browser;
 * this covers everything uploaded before posters existed.
 *
 *   bun run posters:backfill            # every video without a poster
 *   bun run posters:backfill --dry-run  # list them, change nothing
 *   bun run posters:backfill --limit 5  # try a few first
 *
 * Needs ffmpeg on PATH (`brew install ffmpeg`). ffmpeg reads the video over
 * HTTP with range requests, so it fetches only the bytes around the frame,
 * not the whole file. Uses DATABASE_URL and the R2_* variables from the
 * environment (Bun loads .env.local automatically).
 */
import { spawn } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { deliveredVideoUrl } from "@/lib/services/media-url";
import { putR2Object } from "@/lib/services/r2";
import { encodePoster, posterKeyFor } from "@/lib/services/video-posters";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;

/** One PNG frame at `seconds`, or null if ffmpeg could not produce one. */
function grabFrame(url: string, seconds: number) {
  return new Promise<Buffer | null>((resolve) => {
    const ffmpeg = spawn("ffmpeg", [
      "-v", "error",
      "-ss", String(seconds),
      "-i", url,
      "-frames:v", "1",
      "-f", "image2pipe",
      "-c:v", "png",
      "pipe:1",
    ]);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on("error", () => resolve(null));
    ffmpeg.on("close", (code) =>
      resolve(code === 0 && chunks.length ? Buffer.concat(chunks) : null),
    );
  });
}

async function main() {
  const videos = await prisma.video.findMany({
    where: { posterKey: null, videoUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      videoUrl: true,
      storageKey: true,
      durationSeconds: true,
    },
  });
  console.log(`${videos.length} video(s) without a poster${dryRun ? " (dry run)" : ""}.`);

  let done = 0;
  for (const video of videos) {
    const url = deliveredVideoUrl(video);
    if (!url) continue;
    if (dryRun) {
      console.log(`- ${video.title} (${video.id})`);
      continue;
    }
    // Same choice as the browser: a quarter in, capped at one second.
    const at = Math.min(1, (video.durationSeconds ?? 4) / 4);
    const frame = (await grabFrame(url, at)) ?? (await grabFrame(url, 0));
    if (!frame) {
      console.warn(`✗ ${video.title} (${video.id}): ffmpeg could not read a frame`);
      continue;
    }
    // ImageKit videos have no R2 key to sit beside, so their posters get one.
    const key = video.storageKey
      ? posterKeyFor(video.storageKey)
      : `posters/legacy/${video.id}.poster.webp`;
    const { data, aspectRatio } = await encodePoster(frame);
    await putR2Object(key, data, "image/webp");
    await prisma.video.update({
      where: { id: video.id },
      data: { posterKey: key, aspectRatio },
    });
    done += 1;
    console.log(`✓ ${video.title} (${data.length} bytes, ratio ${aspectRatio.toFixed(3)})`);
  }
  if (!dryRun) console.log(`Done: ${done}/${videos.length} poster(s) stored.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
