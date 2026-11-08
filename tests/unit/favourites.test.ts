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
const findUser = mock<
  () => Promise<{
    id: string;
    isAdmin: boolean;
    banned?: boolean;
    uploadBanned?: boolean;
  } | null>
>(async () => ({ id: "owner", isAdmin: false }));
const findVideo = mock<(args: unknown) => Promise<{ id: string } | null>>(
  async () => ({ id: "video-1" }),
);
const findFavourite = mock<(args: unknown) => Promise<{ id: string } | null>>(
  async () => ({ id: "favourite-1" }),
);
const upsert = mock<(args: unknown) => Promise<{ id: string }>>(async () => ({
  id: "favourite-1",
}));
const deleteMany = mock<(args: unknown) => Promise<{ count: number }>>(
  async () => ({ count: 1 }),
);
const findMany = mock<(args: unknown) => Promise<FavouriteRow[]>>(async () => []);

type VideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  isFeatured: boolean;
  creatorName: string;
  creatorUsername: string | null;
  creatorXUrl: string | null;
  creatorProfileUrl: string | null;
  sourceUrl: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  promptStatus: string;
  promptText: string | null;
  negativePrompt: string | null;
  toolsUsed: string[];
  curatorNotes: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  submittedBy: { avatar: "BOY" | "GIRL" };
};

type FavouriteRow = {
  id: string;
  createdAt: Date;
  video: VideoRow;
};

const savedAt = new Date("2026-11-01T12:00:00.000Z");

function videoRow(overrides: Partial<VideoRow> = {}): VideoRow {
  return {
    id: "video-1",
    slug: "chromatic-drift",
    title: "Chromatic Drift",
    description: null,
    category: "ai-motion-design",
    tags: ["iridescent"],
    isFeatured: true,
    creatorName: "Mira Voss",
    creatorUsername: null,
    creatorXUrl: null,
    creatorProfileUrl: null,
    sourceUrl: null,
    videoUrl: "https://ik.imagekit.io/eizoki/videos/drift.mp4",
    durationSeconds: 18,
    promptStatus: "ORIGINAL",
    promptText: "Slow cinematic dolly.",
    negativePrompt: null,
    toolsUsed: ["Runway"],
    curatorNotes: null,
    publishedAt: new Date("2026-10-21T12:00:00.000Z"),
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
    submittedBy: { avatar: "BOY" },
    ...overrides,
  };
}

function favouriteRow(id = "favourite-1", video = videoRow()): FavouriteRow {
  return { id, createdAt: savedAt, video };
}

mock.module("@clerk/nextjs/server", () => ({
  auth: loadAuth,
  currentUser: mock(async () => null),
}));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser },
    video: { findFirst: findVideo },
    favourite: { findMany, findUnique: findFavourite, upsert, deleteMany },
  },
}));

const { GET: listFavourites } = await import("@/app/api/favourites/route");
const {
  GET: getStatus,
  PUT,
  DELETE,
} = await import("@/app/api/videos/[id]/favourite/route");

const context = { params: Promise.resolve({ id: "video-1" }) };
const errorSpy = spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  for (const fn of [
    loadAuth,
    findUser,
    findVideo,
    findFavourite,
    upsert,
    deleteMany,
    findMany,
  ])
    fn.mockClear();
  loadAuth.mockResolvedValue({ userId: "clerk-owner" });
  findUser.mockResolvedValue({ id: "owner", isAdmin: false });
  findVideo.mockResolvedValue({ id: "video-1" });
  findFavourite.mockResolvedValue({ id: "favourite-1" });
  upsert.mockResolvedValue({ id: "favourite-1" });
  deleteMany.mockResolvedValue({ count: 1 });
  findMany.mockResolvedValue([favouriteRow()]);
  errorSpy.mockClear();
});

afterAll(() => {
  errorSpy.mockRestore();
});

describe("GET /api/favourites", () => {
  test("lists the signed-in user's public saves, newest save first", async () => {
    const response = await listFavourites(
      new Request("http://localhost/api/favourites"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");

    const body = await response.json();
    expect(body.nextCursor).toBeNull();
    expect(body.videos[0]).toMatchObject({
      id: "video-1",
      title: "Chromatic Drift",
      favouritedAt: savedAt.toISOString(),
    });

    const args = findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
      take: number;
    };
    expect(args.where).toMatchObject({ userId: "owner" });
    expect(args.where.video).toMatchObject({ reviewStatus: "APPROVED" });
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(args.take).toBe(25);
  });

  test("paginates by bookmark id", async () => {
    findMany.mockResolvedValue([
      favouriteRow("first"),
      favouriteRow("second"),
    ]);
    const response = await listFavourites(
      new Request("http://localhost/api/favourites?limit=1&cursor=previous"),
    );
    expect((await response.json()).nextCursor).toBe("first");
    expect(findMany.mock.calls[0][0]).toMatchObject({
      take: 2,
      skip: 1,
      cursor: { id: "previous" },
    });
  });

  test("rejects invalid pagination", async () => {
    const response = await listFavourites(
      new Request("http://localhost/api/favourites?limit=1000"),
    );
    expect(response.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  test("requires authentication", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    const response = await listFavourites(
      new Request("http://localhost/api/favourites"),
    );
    expect(response.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("video favourite state", () => {
  test("returns false for a signed-out visitor without querying bookmarks", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    const response = await getStatus(
      new Request("http://localhost/api/videos/video-1/favourite"),
      context,
    );
    expect(await response.json()).toEqual({ favourited: false });
    expect(findUser).not.toHaveBeenCalled();
    expect(findFavourite).not.toHaveBeenCalled();
  });

  test("reads the unique bookmark for the signed-in user", async () => {
    const response = await getStatus(
      new Request("http://localhost/api/videos/video-1/favourite"),
      context,
    );
    expect(await response.json()).toEqual({ favourited: true });
    expect(findFavourite.mock.calls[0][0]).toMatchObject({
      where: { userId_videoId: { userId: "owner", videoId: "video-1" } },
    });
  });

  test("reports an unsaved video as false", async () => {
    findFavourite.mockResolvedValue(null);
    const response = await getStatus(
      new Request("http://localhost/api/videos/video-1/favourite"),
      context,
    );
    expect(await response.json()).toEqual({ favourited: false });
  });
});

describe("saving and removing favourites", () => {
  test("saves an idempotent bookmark for a public video", async () => {
    const response = await PUT(
      new Request("http://localhost/api/videos/video-1/favourite", {
        method: "PUT",
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ favourited: true });
    expect(findVideo.mock.calls[0][0]).toMatchObject({
      where: { id: "video-1", reviewStatus: "APPROVED" },
    });
    expect(upsert.mock.calls[0][0]).toEqual({
      where: { userId_videoId: { userId: "owner", videoId: "video-1" } },
      create: { userId: "owner", videoId: "video-1" },
      update: {},
    });
  });

  test("an upload ban leaves favourites working", async () => {
    findUser.mockResolvedValueOnce({ id: "owner", isAdmin: false, uploadBanned: true });
    const response = await PUT(
      new Request("http://localhost/api/videos/video-1/favourite", { method: "PUT" }),
      context,
    );
    expect(response.status).toBe(200);
  });

  test("a suspended account cannot save favourites", async () => {
    findUser.mockResolvedValueOnce({ id: "owner", isAdmin: false, banned: true });
    const response = await PUT(
      new Request("http://localhost/api/videos/video-1/favourite", { method: "PUT" }),
      context,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ACCOUNT_BANNED" });
    expect(upsert).not.toHaveBeenCalled();
  });

  test("never saves a missing or non-public video", async () => {
    findVideo.mockResolvedValue(null);
    const response = await PUT(
      new Request("http://localhost/api/videos/video-1/favourite", {
        method: "PUT",
      }),
      context,
    );
    expect(response.status).toBe(404);
    expect(upsert).not.toHaveBeenCalled();
  });

  test("requires authentication to save or remove", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    const put = await PUT(
      new Request("http://localhost/api/videos/video-1/favourite", {
        method: "PUT",
      }),
      context,
    );
    const remove = await DELETE(
      new Request("http://localhost/api/videos/video-1/favourite", {
        method: "DELETE",
      }),
      context,
    );
    expect(put.status).toBe(401);
    expect(remove.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test("removes only the signed-in user's bookmark", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/videos/video-1/favourite", {
        method: "DELETE",
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ favourited: false });
    expect(deleteMany.mock.calls[0][0]).toEqual({
      where: { userId: "owner", videoId: "video-1" },
    });
  });
});
