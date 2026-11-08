import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

const receipt = {
  id: "video-id",
  slug: "example-video-id",
  title: "Example",
  reviewStatus: "PENDING_REVIEW",
  publishedAt: null,
  createdAt: new Date(),
};
const findUser = mock<
  (args: unknown) => Promise<{ id: string; isAdmin: boolean } | null>
>(async () => ({ id: "submitter", isAdmin: false }));
const saveVideo = mock<(args: unknown) => Promise<typeof receipt>>(
  async () => receipt,
);
const upsertUser = mock<
  (args: unknown) => Promise<{ id: string; isAdmin: boolean }>
>(async () => ({ id: "new-user", isAdmin: false }));
const loadAuth = mock(async (): Promise<{ userId: string | null }> => ({
  userId: "clerk-user",
}));
const loadProfile = mock(async () => ({
  id: "clerk-user",
  primaryEmailAddress: { emailAddress: "creator@example.invalid" },
  emailAddresses: [],
  firstName: null,
  lastName: null,
  username: null,
}));

mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser, upsert: upsertUser },
    video: { create: saveVideo },
  },
}));
mock.module("@clerk/nextjs/server", () => ({
  auth: loadAuth,
  currentUser: loadProfile,
}));

const { POST } = await import("@/app/api/videos/route");
const { MAX_VIDEO_BYTES } = await import("@/lib/services/video-validation");
const fetchSpy = spyOn(globalThis, "fetch");
const errorSpy = spyOn(console, "error").mockImplementation(() => {});
const originalKey = process.env.IMAGEKIT_PRIVATE_KEY;

const asset = {
  fileId: "imagekit-file",
  url: "https://ik.imagekit.io/example/video.mp4",
  duration: 12,
};
const metadata = {
  title: "Example",
  category: "ai-motion-design",
  creatorName: "Other creator",
  creatorXUrl: "https://x.com/creator",
  promptStatus: "ORIGINAL",
  promptText: "  Keep this prompt verbatim.\n",
};

function submission(overrides: Record<string, unknown> = {}, file?: File) {
  const form = new FormData();
  form.set("metadata", JSON.stringify({ ...metadata, ...overrides }));
  form.set(
    "file",
    file ??
      new File(
        [new Uint8Array([0, 0, 0, 20]), "ftypisom", "test-video-data"],
        "video.mp4",
        { type: "video/mp4" },
      ),
  );
  return new Request("http://localhost/api/videos", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  process.env.IMAGEKIT_PRIVATE_KEY = "test-private-key";
  for (const fn of [findUser, saveVideo, upsertUser, loadAuth, loadProfile])
    fn.mockClear();
  findUser.mockResolvedValue({ id: "submitter", isAdmin: false });
  loadAuth.mockResolvedValue({ userId: "clerk-user" });
  saveVideo.mockResolvedValue(receipt);
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue(Response.json(asset));
  errorSpy.mockClear();
});

afterAll(() => {
  fetchSpy.mockRestore();
  errorSpy.mockRestore();
  if (originalKey === undefined) delete process.env.IMAGEKIT_PRIVATE_KEY;
  else process.env.IMAGEKIT_PRIVATE_KEY = originalKey;
});

function savedData() {
  return (saveVideo.mock.calls[0][0] as { data: Record<string, unknown> }).data;
}

describe("POST /api/videos", () => {
  test("stores up to three fixed tags", async () => {
    expect(
      (await POST(submission({ tags: ["cinematic", "glitch", "analog"] })))
        .status,
    ).toBe(201);
    expect(savedData().tags).toEqual(["cinematic", "glitch", "analog"]);
  });

  test.each([
    ["cinematic", "glitch", "analog", "pastel"],
    ["cinematic", "cinematic"],
    ["made-up-tag"],
  ])("rejects invalid tag selection %j", async (...tags) => {
    expect((await POST(submission({ tags }))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveVideo).not.toHaveBeenCalled();
  });
  test("uploads and saves, preserves creator/prompt, and queues community submissions", async () => {
    const response = await POST(submission());
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty("video.id", "video-id");
    expect(savedData()).toMatchObject({
      submittedById: "submitter",
      creatorName: "Other creator",
      creatorXUrl: metadata.creatorXUrl,
      promptText: metadata.promptText,
      imagekitFileId: asset.fileId,
      videoUrl: asset.url,
      durationSeconds: 12,
      reviewStatus: "PENDING_REVIEW",
      publishedAt: null,
      reviewedById: null,
    });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://upload.imagekit.io/api/v1/files/upload");
    expect(options?.method).toBe("POST");
    const body = options?.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect(body.get("folder")).toBe("/eizoki/videos");
    expect(body.get("overwriteFile")).toBe("false");
    expect(body.get("isPrivateFile")).toBe("false");
    for (const field of ["thumbnailUrl", "width", "height", "mediaStatus"]) {
      expect(savedData()).not.toHaveProperty(field);
      expect(responseBody).not.toHaveProperty(`video.${field}`);
    }
  });

  test("uses database admin status to approve and publish immediately", async () => {
    findUser.mockResolvedValue({ id: "admin", isAdmin: true });
    expect(
      (await POST(submission({ isFeatured: true, curatorNotes: "Curated" })))
        .status,
    ).toBe(201);
    expect(savedData()).toMatchObject({
      reviewStatus: "APPROVED",
      reviewedById: "admin",
      isFeatured: true,
      curatorNotes: "Curated",
    });
    expect(savedData().publishedAt).toBeInstanceOf(Date);
  });

  test("rejects unauthenticated submissions before upload", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    expect((await POST(submission())).status).toBe(401);
    expect(findUser).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("provisions a first-time submitter without granting admin", async () => {
    findUser.mockResolvedValue(null);
    expect((await POST(submission())).status).toBe(201);
    expect(upsertUser.mock.calls[0][0]).toMatchObject({
      create: { clerkId: "clerk-user", email: "creator@example.invalid" },
      update: {},
    });
    expect(savedData()).toMatchObject({
      submittedById: "new-user",
      reviewStatus: "PENDING_REVIEW",
    });
  });

  test.each([
    "isAdmin",
    "reviewStatus",
    "submittedById",
    "videoUrl",
    "publishedAt",
  ])("rejects client-controlled %s", async (field) => {
    expect((await POST(submission({ [field]: "spoofed" }))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test.each([{ isFeatured: true }, { curatorNotes: "Unauthorized" }])(
    "rejects admin-only metadata %j",
    async (fields) => {
      expect((await POST(submission(fields))).status).toBe(403);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  test.each([
    { category: "unknown" },
    { creatorXUrl: "https://example.com/fake" },
    { promptText: "  " },
    { title: "" },
  ])("rejects invalid metadata %j", async (fields) => {
    expect((await POST(submission(fields))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects disguised files before uploading", async () => {
    expect(
      (
        await POST(
          submission(
            {},
            new File(["not a video"], "fake.mp4", { type: "video/mp4" }),
          ),
        )
      ).status,
    ).toBe(415);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects oversized requests before parsing", async () => {
    const request = submission();
    request.headers.set("content-length", String(MAX_VIDEO_BYTES + 1_000_000));
    expect((await POST(request)).status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects duplicate multipart fields", async () => {
    const request = submission();
    const form = await request.formData();
    form.append("metadata", "{}");
    expect(
      (await POST(new Request(request.url, { method: "POST", body: form })))
        .status,
    ).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("reports missing configuration without uploading or saving", async () => {
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    expect((await POST(submission())).status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("does not save after provider failure or leak its response", async () => {
    fetchSpy.mockResolvedValue(
      new Response("private-provider-details", { status: 500 }),
    );
    const response = await POST(submission());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private-provider-details");
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("does not save when ImageKit only acknowledges asynchronous processing", async () => {
    fetchSpy.mockResolvedValue(Response.json(asset, { status: 202 }));
    expect((await POST(submission())).status).toBe(502);
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("stores a confirmed upload without dimensions or a thumbnail", async () => {
    fetchSpy.mockResolvedValue(
      Response.json({ fileId: asset.fileId, url: asset.url }),
    );
    expect((await POST(submission())).status).toBe(201);
    expect(savedData()).toMatchObject({
      imagekitFileId: asset.fileId,
      videoUrl: asset.url,
    });
  });

  test("cleans up an incomplete provider result", async () => {
    fetchSpy.mockResolvedValueOnce(Response.json({ fileId: asset.fileId }));
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await POST(submission())).status).toBe(502);
    expect(fetchSpy.mock.calls[1][1]?.method).toBe("DELETE");
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("deletes the uploaded asset when persistence fails", async () => {
    saveVideo.mockRejectedValueOnce(new Error("database-private-details"));
    fetchSpy.mockResolvedValueOnce(Response.json(asset));
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await POST(submission());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-private-details");
    expect(fetchSpy.mock.calls[1][0]).toBe(
      "https://api.imagekit.io/v1/files/imagekit-file",
    );
    expect(fetchSpy.mock.calls[1][1]?.method).toBe("DELETE");
  });

  test("keeps the original error and logs reconciliation when cleanup also fails", async () => {
    saveVideo.mockRejectedValueOnce(new Error("database failure"));
    fetchSpy.mockResolvedValueOnce(Response.json(asset));
    fetchSpy.mockRejectedValueOnce(new Error("cleanup failure"));
    expect((await POST(submission())).status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith(
      "Orphaned ImageKit video requires cleanup",
      { fileId: asset.fileId },
    );
  });
});
