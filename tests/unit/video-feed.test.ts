import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

type FeedRow = {
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

const publishedAt = new Date("2026-10-21T12:00:00.000Z");

function row(overrides: Partial<FeedRow> = {}): FeedRow {
  return {
    id: "video-1",
    slug: "chromatic-drift",
    title: "Chromatic Drift",
    description: null,
    category: "ai-motion-design",
    tags: ["iridescent"],
    isFeatured: true,
    creatorName: "Mira Voss",
    creatorUsername: "miravoss",
    creatorXUrl: "https://x.com/miravoss",
    creatorProfileUrl: null,
    sourceUrl: null,
    videoUrl: "https://ik.imagekit.io/eizoki/videos/drift.mp4",
    durationSeconds: 18,
    promptStatus: "ORIGINAL",
    promptText: "Slow cinematic dolly.",
    negativePrompt: null,
    toolsUsed: ["Runway"],
    curatorNotes: null,
    publishedAt,
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
    submittedBy: { avatar: "BOY" },
    ...overrides,
  };
}

const findMany = mock<(args: unknown) => Promise<FeedRow[]>>(async () => []);
const errorSpy = spyOn(console, "error").mockImplementation(() => {});

mock.module("@/lib/prisma", () => ({
  prisma: { video: { findMany } },
}));

const getLiveFeedSponsor = mock<() => Promise<unknown>>(async () => null);
// The cached sponsor read needs the Next.js runtime; the route only composes it.
mock.module("@/lib/services/sponsorships", () => ({ getLiveFeedSponsor }));

const { GET } = await import("@/app/api/videos/route");

beforeEach(() => {
  getLiveFeedSponsor.mockClear();
  getLiveFeedSponsor.mockResolvedValue(null);
  findMany.mockClear();
  findMany.mockResolvedValue([row()]);
  errorSpy.mockClear();
});

afterAll(() => {
  errorSpy.mockRestore();
});

function request(query = "") {
  return new Request(`http://localhost/api/videos${query ? `?${query}` : ""}`);
}

describe("GET /api/videos", () => {
  test("pins the live feed sponsor on the first page only", async () => {
    const sponsor = {
      id: "sponsorship-1",
      productName: "DaemonDoc",
      href: "https://daemondoc.online/?utm_source=eizoki.com",
      iconUrl: null,
      description: null,
      videoUrl: "https://ik.imagekit.io/eizoki/sponsors/videos/launch.mp4",
    };
    getLiveFeedSponsor.mockResolvedValue(sponsor);
    expect((await (await GET(request())).json()).sponsor).toEqual(sponsor);

    getLiveFeedSponsor.mockClear();
    const paged = await (await GET(request("cursor=video-1"))).json();
    expect(paged.sponsor).toBeNull();
    expect(getLiveFeedSponsor).not.toHaveBeenCalled();
  });

  test("returns only public fields and maps the database record for the feed", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.nextCursor).toBeNull();
    expect(body.videos).toEqual([
      {
        id: "video-1",
        slug: "chromatic-drift",
        title: "Chromatic Drift",
        category: "ai-motion-design",
        tags: ["iridescent"],
        isFeatured: true,
        videoUrl: "https://ik.imagekit.io/eizoki/videos/drift.mp4",
        durationSeconds: 18,
        creator: {
          name: "Mira Voss",
          avatarUrl: "/avatars/male-transparent.png",
          handle: "@miravoss",
          profileUrl: "https://x.com/miravoss",
          xProfileUrl: "https://x.com/miravoss",
          platform: "x",
        },
        promptStatus: "original",
        promptText: "Slow cinematic dolly.",
        toolsUsed: ["Runway"],
        publishedAt: publishedAt.toISOString(),
      },
    ]);

    const args = findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      take: number;
      orderBy: unknown;
    };
    expect(args.where).toMatchObject({ reviewStatus: "APPROVED" });
    expect(args.where.publishedAt).toMatchObject({ not: null });
    expect(args.take).toBe(25);
    expect(args.orderBy).toEqual([{ publishedAt: "desc" }, { id: "desc" }]);
  });

  test("uses the uploader's selected female avatar", async () => {
    findMany.mockResolvedValue([row({ submittedBy: { avatar: "GIRL" } })]);
    const response = await GET(request());
    expect((await response.json()).videos[0].creator.avatarUrl).toBe(
      "/avatars/female-transparent.png",
    );
    expect(findMany.mock.calls[0][0]).toMatchObject({
      select: { submittedBy: { select: { avatar: true } } },
    });
  });

  test("uses a keyset cursor and reports the next page", async () => {
    findMany.mockResolvedValue([row({ id: "first" }), row({ id: "second" })]);
    const response = await GET(request("limit=1&cursor=previous"));
    expect(response.status).toBe(200);
    expect((await response.json()).nextCursor).toBe("first");

    const args = findMany.mock.calls[0][0] as {
      cursor?: unknown;
      skip?: number;
      take: number;
    };
    expect(args.cursor).toEqual({ id: "previous" });
    expect(args.skip).toBe(1);
    expect(args.take).toBe(2);
  });

  test("keeps the X account, portfolio, and original post separate", async () => {
    findMany.mockResolvedValue([
      row({
        creatorProfileUrl: "https://creator.example.com",
        sourceUrl: "https://x.com/miravoss/status/123",
      }),
    ]);
    const response = await GET(request());
    const video = (await response.json()).videos[0];
    expect(video.creator).toMatchObject({
      profileUrl: "https://creator.example.com",
      xProfileUrl: "https://x.com/miravoss",
      handle: "@miravoss",
    });
    expect(video.sourceUrl).toBe("https://x.com/miravoss/status/123");
  });

  test("does not turn an original post into a creator profile", async () => {
    findMany.mockResolvedValue([
      row({
        creatorXUrl: null,
        creatorUsername: null,
        creatorProfileUrl: null,
        sourceUrl: "https://x.com/miravoss/status/123",
      }),
    ]);
    const response = await GET(request());
    const video = (await response.json()).videos[0];
    expect(video.creator.profileUrl).toBeUndefined();
    expect(video.creator.xProfileUrl).toBeUndefined();
    expect(video.sourceUrl).toBe("https://x.com/miravoss/status/123");
  });

  test("filters by a known category", async () => {
    await GET(request("category=launch-videos"));
    const args = findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(args.where.category).toBe("launch-videos");
  });

  test.each([
    "limit=0",
    "limit=49",
    "limit=not-a-number",
    "category=unknown",
    "cursor=",
  ])("rejects invalid query %s", async (query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });

  test("does not leak database details when the query fails", async () => {
    findMany.mockRejectedValueOnce(new Error("connection refused"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("connection refused");
    expect(errorSpy).toHaveBeenCalledWith("Video feed failed", {
      name: "Error",
    });
  });
});
