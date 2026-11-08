import { describe, expect, test } from "bun:test";
import { creatorXProfile, submissionMetadata } from "@/lib/video-submission";

describe("submission form metadata", () => {
  test("includes selected fixed tags in selection order", () => {
    const form = new FormData();
    form.append("tags", "glitch");
    form.append("tags", "cinematic");
    expect(submissionMetadata(form, false).tags).toEqual([
      "glitch",
      "cinematic",
    ]);
  });
  test.each([
    "@motionmaker",
    "motionmaker",
    "https://x.com/motionmaker",
    "https://twitter.com/motionmaker/",
  ])("normalizes X attribution from %s", (value) => {
    expect(creatorXProfile(value)).toEqual({
      creatorUsername: "@motionmaker",
      creatorXUrl: "https://x.com/motionmaker",
    });
  });
  test.each([
    "https://example.com/creator",
    "https://x.com/creator/status/123",
    "bad handle",
  ])("rejects invalid X attribution %s", (value) => {
    expect(() => creatorXProfile(value)).toThrow();
  });
  test("omits an unavailable prompt and admin-only fields for community submissions", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      title: " A video ",
      category: "ui-motion",
      creatorName: " Another creator ",
      promptText: " ",
      curatorNotes: "spoofed",
      isFeatured: "on",
    }))
      form.set(key, value);
    const metadata = submissionMetadata(form, false);
    expect(metadata).toMatchObject({
      title: "A video",
      creatorName: "Another creator",
      promptStatus: "UNAVAILABLE",
      isFeatured: false,
    });
    expect(metadata.promptText).toBeUndefined();
    expect(metadata.curatorNotes).toBeUndefined();
  });
  test("preserves prompt whitespace and supports reconstructed prompts and admin options", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      promptText: "  A prompt.\n",
      promptStatus: "RECONSTRUCTED",
      toolsUsed: "Runway, After Effects, Runway",
      isFeatured: "on",
      curatorNotes: "Editorial note",
    }))
      form.set(key, value);
    expect(submissionMetadata(form, true)).toMatchObject({
      promptText: "  A prompt.\n",
      promptStatus: "RECONSTRUCTED",
      toolsUsed: ["Runway", "After Effects"],
      isFeatured: true,
      curatorNotes: "Editorial note",
    });
  });
});
