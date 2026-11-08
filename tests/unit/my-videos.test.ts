import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

const loadAuth = mock(async (): Promise<{ userId: string | null }> => ({
  userId: "clerk-owner",
}));
const findUser = mock(async () => ({ id: "owner", isAdmin: false }));
function row(reviewStatus = "PENDING_REVIEW", id = "owned-video") {
  return {
    id,
    slug: id,
    title: "My upload",
    description: null,
    category: "ai-motion-design",
    tags: [],
    isFeatured: false,
    creatorName: "Another creator",
    submittedBy: { avatar: "BOY" as const },
    creatorUsername: null,
    creatorXUrl: null,
    creatorProfileUrl: null,
    sourceUrl: null,
    videoUrl: "https://ik.imagekit.io/example/video.mp4",
    durationSeconds: 10,
    promptStatus: "UNAVAILABLE",
    promptText: null,
    negativePrompt: null,
    toolsUsed: [],
    curatorNotes: null,
    publishedAt: reviewStatus === "APPROVED" ? new Date("2026-01-01") : null,
    createdAt: new Date("2026-01-01"),
    reviewStatus,
  };
}
const findMany = mock<(args: unknown) => Promise<ReturnType<typeof row>[]>>(
  async () => [row()],
);
const findOwned = mock<
  (
    args: unknown,
  ) => Promise<{ imagekitFileId: string | null; storageKey: string | null } | null>
>(async () => ({ imagekitFileId: "owned-asset", storageKey: null }));
const deleteR2 = mock<(key: string) => Promise<void>>(async () => {});
mock.module("@/lib/services/r2", () => ({
  deleteR2Object: deleteR2,
  cleanupR2Object: mock(async () => {}),
}));
const deleteMany = mock<(args: unknown) => Promise<{ count: number }>>(
  async () => ({ count: 1 }),
);
mock.module("@clerk/nextjs/server", () => ({
  auth: loadAuth,
  currentUser: mock(async () => null),
}));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser },
    video: { findMany, findFirst: findOwned, deleteMany },
  },
}));
const { GET } = await import("@/app/api/videos/mine/route");
const { DELETE } = await import("@/app/api/videos/[id]/route");
const fetchSpy = spyOn(globalThis, "fetch");
const errorSpy = spyOn(console, "error").mockImplementation(() => {});
const oldKey = process.env.IMAGEKIT_PRIVATE_KEY;
const context = { params: Promise.resolve({ id: "owned-video" }) };
const getRequest = (query = "") =>
  new Request(`http://localhost/api/videos/mine${query}`);
const deleteRequest = () =>
  new Request("http://localhost/api/videos/owned-video", { method: "DELETE" });

beforeEach(() => {
  process.env.IMAGEKIT_PRIVATE_KEY = "test-key";
  for (const fn of [loadAuth, findUser, findMany, findOwned, deleteMany])
    fn.mockClear();
  loadAuth.mockResolvedValue({ userId: "clerk-owner" });
  findUser.mockResolvedValue({ id: "owner", isAdmin: false });
  findMany.mockResolvedValue([row()]);
  findOwned.mockResolvedValue({ imagekitFileId: "owned-asset", storageKey: null });
  deleteR2.mockClear();
  deleteMany.mockResolvedValue({ count: 1 });
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
  errorSpy.mockClear();
});
afterAll(() => {
  fetchSpy.mockRestore();
  errorSpy.mockRestore();
  if (oldKey === undefined) delete process.env.IMAGEKIT_PRIVATE_KEY;
  else process.env.IMAGEKIT_PRIVATE_KEY = oldKey;
});

describe("private video management", () => {
  test("lists only the signed-in submitter's uploads across all review states", async () => {
    findMany.mockResolvedValue([
      row(),
      row("APPROVED", "published"),
      row("REJECTED", "rejected"),
    ]);
    const response = await GET(getRequest("?submittedById=someone-else"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(
      body.videos.map((video: { reviewStatus: string }) => video.reviewStatus),
    ).toEqual(["PENDING_REVIEW", "APPROVED", "REJECTED"]);
    expect(body.videos[0].publishedAt).toBeUndefined();
    expect(body.videos[0].creator.name).toBe("Another creator");
    expect(body.videos[0]).not.toHaveProperty("imagekitFileId");
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { submittedById: "owner" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(
      (findMany.mock.calls[0][0] as { where: unknown }).where,
    ).not.toHaveProperty("reviewStatus");
  });
  test("paginates private uploads", async () => {
    findMany.mockResolvedValue([
      row("APPROVED", "first"),
      row("REJECTED", "second"),
    ]);
    const response = await GET(getRequest("?limit=1&cursor=previous"));
    expect((await response.json()).nextCursor).toBe("first");
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { submittedById: "owner" },
      take: 2,
      skip: 1,
      cursor: { id: "previous" },
    });
  });
  test("rejects invalid pagination", async () => {
    expect((await GET(getRequest("?limit=1000"))).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });
  test("requires authentication to read or delete", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    expect((await GET(getRequest())).status).toBe(401);
    expect((await DELETE(deleteRequest(), context)).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
    expect(findOwned).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test("never deletes another user's or a missing video", async () => {
    findOwned.mockResolvedValue(null);
    expect((await DELETE(deleteRequest(), context)).status).toBe(404);
    expect(findOwned.mock.calls[0][0]).toMatchObject({
      where: { id: "owned-video", submittedById: "owner" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
  test("an admin (per Postgres) can delete any user's video", async () => {
    findUser.mockResolvedValue({ id: "admin", isAdmin: true });
    expect((await DELETE(deleteRequest(), context)).status).toBe(204);
    expect(findOwned.mock.calls[0][0]).toMatchObject({
      where: { id: "owned-video" },
    });
    expect(deleteMany.mock.calls[0][0]).toEqual({
      where: { id: "owned-video" },
    });
  });
  test("a client claiming admin cannot widen the delete", async () => {
    // The request carries no say in privilege; only the database row counts.
    findUser.mockResolvedValue({ id: "intruder", isAdmin: false });
    findOwned.mockResolvedValue(null);
    const request = new Request(deleteRequest(), {
      headers: { "x-is-admin": "true" },
    });
    expect((await DELETE(request, context)).status).toBe(404);
    expect(findOwned.mock.calls[0][0]).toMatchObject({
      where: { id: "owned-video", submittedById: "intruder" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
  test("removes the ImageKit asset before the ownership-scoped database entry", async () => {
    deleteMany.mockImplementationOnce(async () => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      return { count: 1 };
    });
    expect((await DELETE(deleteRequest(), context)).status).toBe(204);
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://api.imagekit.io/v1/files/owned-asset",
    );
    expect(fetchSpy.mock.calls[0][1]?.method).toBe("DELETE");
    expect(deleteMany.mock.calls[0][0]).toEqual({
      where: { id: "owned-video", submittedById: "owner" },
    });
  });
  test("removes R2-stored videos from R2, not ImageKit", async () => {
    findOwned.mockResolvedValue({
      imagekitFileId: null,
      storageKey: "videos/owner/file.mp4",
    });
    expect((await DELETE(deleteRequest(), context)).status).toBe(204);
    expect(deleteR2).toHaveBeenCalledWith("videos/owner/file.mp4");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });
  test("keeps the database entry when R2 removal fails", async () => {
    findOwned.mockResolvedValue({
      imagekitFileId: null,
      storageKey: "videos/owner/file.mp4",
    });
    deleteR2.mockRejectedValueOnce(new Error("r2 down"));
    expect((await DELETE(deleteRequest(), context)).status).toBe(502);
    expect(deleteMany).not.toHaveBeenCalled();
  });
  test("keeps the database entry when ImageKit removal fails", async () => {
    fetchSpy.mockResolvedValue(
      new Response("provider secret details", { status: 500 }),
    );
    const response = await DELETE(deleteRequest(), context);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("provider secret details");
    expect(deleteMany).not.toHaveBeenCalled();
  });
  test("allows retries when the ImageKit asset has already been removed", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }));
    expect((await DELETE(deleteRequest(), context)).status).toBe(204);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });
  test("reports a partial deletion with an actionable retry message", async () => {
    deleteMany.mockRejectedValueOnce(new Error("private DB details"));
    const response = await DELETE(deleteRequest(), context);
    expect(response.status).toBe(500);
    expect((await response.json()).error).toContain("Please retry");
  });
});
