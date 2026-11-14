/**
 * Give videos a feed preview: a short, small, silent MP4 that cards play
 * instead of the original file. Originals can be 30 MB; a preview is about
 * 1 MB, so the feed fills fast on phones. The full player keeps the original.
 *
 *   bun run previews:backfill            # every approved video without a preview
 *   bun run previews:backfill --dry-run  # list them, change nothing
 *   bun run previews:backfill --limit 5  # try a few first
 *   bun run previews:backfill --pending  # also pending submissions
 *
 * Run it after approving new videos: until a video has a preview, its card
 * plays the original, so nothing breaks, it is only heavier.
 *
 * Needs ffmpeg on PATH (`brew install ffmpeg`). Uses DATABASE_URL and the R2_*
 * variables from the environment (Bun loads .env.local automatically).
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { deliveredVideoUrl } from "@/lib/services/media-url";
import { putR2Object } from "@/lib/services/r2";

/** Cards are at most ~400 CSS px wide; 640 px covers 1.5x screens sharply. */
const PREVIEW_WIDTH = 640;
/** Feed loops are short; the full film plays in the preview player. */
const PREVIEW_SECONDS = 8;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includePending = args.includes("--pending");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;

/** A video key `videos/<user>/<uuid>.mp4` gets `videos/<user>/<uuid>.preview.mp4`. */
function previewKeyFor(video: { id: string; storageKey: string | null }) {
  return video.storageKey
    ? `${video.storageKey.replace(/\.[^./]+$/, "")}.preview.mp4`
    : `previews/legacy/${video.id}.preview.mp4`;
}

function run(command: string, commandArgs: string[]) {
  return new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const child = spawn(command, commandArgs);
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => resolve({ code: 1, stderr: String(error) }));
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

/**
 * Encode the first PREVIEW_SECONDS as H.264 Main (plays everywhere, including
 * older iOS), no audio, at most PREVIEW_WIDTH wide, never upscaled. faststart
 * puts the index first so playback starts before the download ends.
 */
async function encodePreview(url: string, outPath: string) {
  const { code, stderr } = await run("ffmpeg", [
    "-v", "error",
    "-y",
    "-i", url,
    "-t", String(PREVIEW_SECONDS),
    "-an",
    "-vf", `scale='min(${PREVIEW_WIDTH},iw)':-2,fps=30`,
    "-c:v", "libx264",
    "-profile:v", "main",
    "-pix_fmt", "yuv420p",
    "-preset", "slow",
    "-crf", "27",
    "-movflags", "+faststart",
    outPath,
  ]);
  if (code !== 0) throw new Error(stderr.trim().split("\n").pop() || "ffmpeg failed");
  return readFile(outPath);
}

async function originalSize(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const length = Number(response.headers.get("content-length"));
    return Number.isFinite(length) && length > 0 ? length : undefined;
  } catch {
    return undefined;
  }
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;

async function main() {
  const videos = await prisma.video.findMany({
    where: {
      previewKey: null,
      videoUrl: { not: null },
      reviewStatus: includePending
        ? { in: ["APPROVED", "PENDING_REVIEW"] }
        : "APPROVED",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, videoUrl: true, storageKey: true },
  });
  console.log(`${videos.length} video(s) without a preview${dryRun ? " (dry run)" : ""}.`);

  const workDir = await mkdtemp(join(tmpdir(), "eizoki-previews-"));
  let done = 0;
  let before = 0;
  let after = 0;
  try {
    for (const video of videos) {
      const url = deliveredVideoUrl(video);
      if (!url) continue;
      if (dryRun) {
        console.log(`- ${video.title} (${video.id})`);
        continue;
      }
      try {
        const data = await encodePreview(url, join(workDir, `${video.id}.mp4`));
        const original = await originalSize(url);
        // A clip that saves nothing is not worth a second file.
        if (original && data.length >= original * 0.8) {
          console.log(`= ${video.title}: original is already small (${mb(original)}), skipped`);
          continue;
        }
        const key = previewKeyFor(video);
        await putR2Object(key, data, "video/mp4");
        await prisma.video.update({
          where: { id: video.id },
          data: { previewKey: key },
        });
        done += 1;
        before += original ?? 0;
        after += data.length;
        console.log(
          `✓ ${video.title}: ${original ? mb(original) : "?"} → ${mb(data.length)}`,
        );
      } catch (error) {
        console.warn(
          `✗ ${video.title} (${video.id}): ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  if (!dryRun) {
    console.log(`Done: ${done}/${videos.length} preview(s) stored.`);
    if (done) console.log(`Feed weight for these: ${mb(before)} → ${mb(after)}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
