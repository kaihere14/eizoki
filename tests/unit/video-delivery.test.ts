import { expect, test } from "bun:test";
import { playableVideoUrl } from "@/lib/video-delivery";

test("ImageKit videos are served as the original upload", () => {
  expect(playableVideoUrl("https://ik.imagekit.io/eizoki/videos/a.mp4")).toBe(
    "https://ik.imagekit.io/eizoki/videos/a.mp4?tr=orig-true",
  );
});

test("an explicit transformation and other hosts are left alone", () => {
  for (const url of [
    "https://ik.imagekit.io/eizoki/videos/a.mp4?tr=w-640",
    "https://cdn.example.com/a.mp4",
    "/playback-fixture.webm",
  ]) {
    expect(playableVideoUrl(url)).toBe(url);
  }
});
