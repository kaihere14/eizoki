import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { promptWithVideoReference } from "@/lib/video-reference";

const findFirst = mock<(args: unknown) => Promise<{ videoUrl: string; storageKey?: string | null } | null>>(
  async () => ({ videoUrl: "https://ik.imagekit.io/example/video.mp4" }),
);
mock.module("@/lib/prisma", () => ({ prisma: { video: { findFirst } } }));
const { GET } = await import("@/app/api/videos/[id]/reference/route");
const request = new Request("https://eizoki.com/api/videos/video-1/reference");
const context = () => ({ params: Promise.resolve({ id: "video-1" }) });
const originalPublicUrl = process.env.R2_PUBLIC_URL;

afterEach(() => {
  if (originalPublicUrl === undefined) delete process.env.R2_PUBLIC_URL;
  else process.env.R2_PUBLIC_URL = originalPublicUrl;
});

beforeEach(() => {
  findFirst.mockClear();
  findFirst.mockResolvedValue({
    videoUrl: "https://ik.imagekit.io/example/video.mp4",
  });
});

describe("video reference", () => {
  test("redirects R2 references to the current public domain with the original file key", async () => {
    process.env.R2_PUBLIC_URL = "https://media.example.invalid";
    findFirst.mockResolvedValue({
      videoUrl: "https://pub-old.r2.dev/videos/u/original.mp4",
      storageKey: "videos/u/original.mp4",
    });
    const response = await GET(request, context());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://media.example.invalid/videos/u/original.mp4",
    );
    expect(findFirst.mock.calls[0][0]).toMatchObject({
      select: { videoUrl: true, storageKey: true },
    });
  });
  test.each([undefined, "", "  \n"])(
    "copies only the reference instruction when the prompt is %j",
    (prompt) => {
      expect(
        promptWithVideoReference(prompt, "video-1", "https://eizoki.com"),
      ).toBe(
        "Please use this video as the reference:\nhttps://eizoki.com/api/videos/video-1/reference",
      );
    },
  );
  test("preserves the prompt and appends the website's stable reference URL", () => {
    const prompt = "  Cinematic motion.\n";
    expect(
      promptWithVideoReference(prompt, "video-1", "https://eizoki.com"),
    ).toBe(
      `${prompt}\n\nPlease use this video as the reference:\nhttps://eizoki.com/api/videos/video-1/reference`,
    );
  });
  test("redirects to the uploaded video and checks approval and publication time", async () => {
    const response = await GET(request, context());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ik.imagekit.io/example/video.mp4?tr=orig-true",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(findFirst.mock.calls[0][0]).toMatchObject({
      where: {
        id: "video-1",
        reviewStatus: "APPROVED",
        publishedAt: { not: null, lte: expect.any(Date) },
      },
      select: { videoUrl: true, storageKey: true },
    });
  });
  test("does not expose unpublished, rejected, pending, or missing references", async () => {
    findFirst.mockResolvedValue(null);
    const response = await GET(request, context());
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });
  test("keeps database failures private", async () => {
    findFirst.mockRejectedValueOnce(new Error("private database details"));
    const response = await GET(request, context());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database details");
  });
});
