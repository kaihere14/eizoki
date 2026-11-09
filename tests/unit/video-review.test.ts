import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

type File = {
  storageKey: string | null;
  imagekitFileId: string | null;
  posterKey?: string | null;
};
const findVideo = mock<(args: unknown) => Promise<File | { id: string } | null>>(
  async () => ({ storageKey: "videos/u/a.mp4", imagekitFileId: null }),
);
const updateVideos = mock<(args: unknown) => Promise<{ count: number }>>(
  async () => ({ count: 1 }),
);
const order: string[] = [];
const cleanupR2 = mock<(key: string) => Promise<void>>(async () => {
  order.push("delete-file");
});

mock.module("@/lib/prisma", () => ({
  prisma: { video: { findUnique: findVideo, updateMany: updateVideos } },
}));
// Module mocks are process-wide in Bun: keep every real export, override one.
const realR2 = { ...(await import("@/lib/services/r2")) };
mock.module("@/lib/services/r2", () => ({ ...realR2, cleanupR2Object: cleanupR2 }));

const { approveVideo, rejectVideo } = await import("@/lib/services/video-review");
const fetchSpy = spyOn(globalThis, "fetch");

beforeEach(() => {
  for (const fn of [findVideo, updateVideos, cleanupR2]) fn.mockClear();
  order.length = 0;
  findVideo.mockResolvedValue({ storageKey: "videos/u/a.mp4", imagekitFileId: null });
  updateVideos.mockImplementation(async () => {
    order.push("update");
    return { count: 1 };
  });
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
  process.env.IMAGEKIT_PRIVATE_KEY = "test-key";
});

function updateArgs() {
  return updateVideos.mock.calls[0][0] as {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  };
}

describe("rejecting a video", () => {
  test("clears the file link in the guarded update, then deletes the R2 file", async () => {
    await rejectVideo("video-1", "  Off topic ", "admin");
    expect(updateArgs().where).toEqual({ id: "video-1", reviewStatus: "PENDING_REVIEW" });
    expect(updateArgs().data).toMatchObject({
      reviewStatus: "REJECTED",
      reviewNotes: "Off topic",
      videoUrl: null,
      storageKey: null,
      imagekitFileId: null,
      publishedAt: null,
    });
    expect(cleanupR2).toHaveBeenCalledWith("videos/u/a.mp4");
    // The record changes first, so a concurrent approval can never point at a deleted file.
    expect(order).toEqual(["update", "delete-file"]);
  });

  test("deletes the poster frame along with the video", async () => {
    findVideo.mockResolvedValue({
      storageKey: "videos/u/a.mp4",
      imagekitFileId: null,
      posterKey: "videos/u/a.poster.webp",
    });
    await rejectVideo("video-1", undefined, "admin");
    expect(updateArgs().data).toMatchObject({ posterKey: null });
    expect(cleanupR2).toHaveBeenCalledWith("videos/u/a.poster.webp");
  });

  test("deletes older ImageKit files the same way", async () => {
    findVideo.mockResolvedValue({ storageKey: null, imagekitFileId: "ik-file" });
    await rejectVideo("video-1", undefined, "admin");
    expect(cleanupR2).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.imagekit.io/v1/files/ik-file");
    expect(fetchSpy.mock.calls[0][1]?.method).toBe("DELETE");
  });

  test("keeps the file when another admin already decided", async () => {
    updateVideos.mockResolvedValue({ count: 0 });
    findVideo
      .mockResolvedValueOnce({ storageKey: "videos/u/a.mp4", imagekitFileId: null })
      .mockResolvedValueOnce({ id: "video-1" });
    await expect(rejectVideo("video-1", undefined, "admin")).rejects.toMatchObject({
      status: 409,
    });
    expect(cleanupR2).not.toHaveBeenCalled();
  });
});

test("approving keeps the file", async () => {
  await approveVideo("video-1", "admin");
  expect(updateArgs().data).not.toHaveProperty("videoUrl");
  expect(updateArgs().data).toMatchObject({ reviewStatus: "APPROVED" });
  expect(cleanupR2).not.toHaveBeenCalled();
});
