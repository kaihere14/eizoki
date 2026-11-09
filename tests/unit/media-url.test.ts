import { afterEach, describe, expect, test } from "bun:test";
import { deliveredVideoUrl, r2ObjectUrl } from "@/lib/services/media-url";

const original = process.env.R2_PUBLIC_URL;
afterEach(() => {
  process.env.R2_PUBLIC_URL = original;
});

describe("media URLs", () => {
  test("builds R2 URLs from the current public domain, not the stored URL", () => {
    process.env.R2_PUBLIC_URL = ' "https://media.example.invalid/" \n';
    expect(
      deliveredVideoUrl({
        storageKey: "videos/u/a.mp4",
        videoUrl: "https://pub-old.r2.dev/videos/u/a.mp4",
      }),
    ).toBe("https://media.example.invalid/videos/u/a.mp4");
    expect(r2ObjectUrl("videos/u/a.poster.webp")).toBe(
      "https://media.example.invalid/videos/u/a.poster.webp",
    );
  });

  test("falls back to the stored URL when no public domain is configured", () => {
    delete process.env.R2_PUBLIC_URL;
    expect(
      deliveredVideoUrl({ storageKey: "videos/u/a.mp4", videoUrl: "https://pub-old.r2.dev/videos/u/a.mp4" }),
    ).toBe("https://pub-old.r2.dev/videos/u/a.mp4");
    expect(r2ObjectUrl("videos/u/a.poster.webp")).toBeUndefined();
  });

  test("keeps ImageKit files on their untransformed URL", () => {
    process.env.R2_PUBLIC_URL = "https://media.example.invalid";
    expect(
      deliveredVideoUrl({ storageKey: null, videoUrl: "https://ik.imagekit.io/x/v.mp4" }),
    ).toBe("https://ik.imagekit.io/x/v.mp4?tr=orig-true");
    expect(deliveredVideoUrl({ storageKey: null, videoUrl: null })).toBeNull();
  });
});
