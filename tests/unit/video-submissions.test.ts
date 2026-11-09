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
type Row = { id: string; isAdmin: boolean; banned?: boolean; uploadBanned?: boolean };
const findUser = mock<(args: unknown) => Promise<Row | null>>(async () => ({
  id: "submitter",
  isAdmin: false,
}));
const findPending = mock<(args: unknown) => Promise<{ id: string } | null>>(
  async () => null,
);
const saveVideo = mock<(args: unknown) => Promise<typeof receipt>>(
  async () => receipt,
);
const findVideo = mock<(args: unknown) => Promise<{ id: string } | null>>(
  async () => null,
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

// The R2 boundary: no network, and every call is observable.
const createUpload = mock<(key: string, type: string) => Promise<string>>(
  async () => "upload-id",
);
const signPart = mock(
  async (key: string, _id: string, part: number) =>
    `https://r2.example.invalid/${key}?partNumber=${part}`,
);
const completeUpload = mock<
  (key: string, id: string, parts: unknown) => Promise<boolean>
>(async () => true);
const abortUpload = mock(async () => {});
const head = mock<
  (key: string) => Promise<{ size: number; contentType: string } | null>
>(async () => ({ size: 27, contentType: "video/mp4" }));
const readHeader = mock(
  async () => new Uint8Array([0, 0, 0, 20, ...new TextEncoder().encode("ftypisom")]),
);
const deleteObject = mock<(key: string) => Promise<void>>(async () => {});
const cleanupObject = mock<(key: string) => Promise<void>>(async () => {});
const putObject = mock<
  (key: string, body: Uint8Array, type: string) => Promise<void>
>(async () => {});

mock.module("@/lib/services/r2", () => ({
  createMultipartUpload: createUpload,
  signUploadPart: signPart,
  completeMultipartUpload: completeUpload,
  abortMultipartUpload: abortUpload,
  headObject: head,
  readObjectHeader: readHeader,
  deleteR2Object: deleteObject,
  cleanupR2Object: cleanupObject,
  putR2Object: putObject,
  r2PublicUrl: (key: string) => `https://media.example.invalid/${key}`,
}));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser, upsert: upsertUser },
    video: { create: saveVideo, findUnique: findVideo, findFirst: findPending },
  },
}));
mock.module("@clerk/nextjs/server", () => ({
  auth: loadAuth,
  currentUser: loadProfile,
}));

const { POST } = await import("@/app/api/videos/route");
const { POST: START } = await import("@/app/api/uploads/route");
const { POST: ABORT } = await import("@/app/api/uploads/abort/route");
const { MAX_VIDEO_BYTES, VIDEO_PART_BYTES } = await import(
  "@/lib/video-upload-limits"
);
const errorSpy = spyOn(console, "error").mockImplementation(() => {});

const KEY = "videos/submitter/0b7c5c1e-9a55-4a8e-8f0e-1d2c3b4a5f60.mp4";
const upload = {
  key: KEY,
  uploadId: "upload-id",
  parts: [{ partNumber: 1, etag: '"etag-1"' }],
  durationSeconds: 12,
};
const metadata = {
  title: "Example",
  category: "ai-motion-design",
  creatorName: "Other creator",
  creatorXUrl: "https://x.com/creator",
  promptStatus: "ORIGINAL",
  promptText: "  Keep this prompt verbatim.\n",
};

function json(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function submission(
  overrides: Record<string, unknown> = {},
  uploadOverrides: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return json("http://localhost/api/videos", {
    metadata: { ...metadata, ...overrides },
    upload: { ...upload, ...uploadOverrides },
    ...extra,
  });
}

/** A real 1280×720 PNG frame, as the browser would send it. */
const sharp = (await import("sharp")).default;
const POSTER = (
  await sharp({
    create: { width: 1280, height: 720, channels: 3, background: "#d6336c" },
  })
    .png()
    .toBuffer()
).toString("base64");
const POSTER_KEY = KEY.replace(/\.mp4$/, ".poster.webp");

const allMocks = [
  findUser,
  findPending,
  saveVideo,
  findVideo,
  upsertUser,
  loadAuth,
  loadProfile,
  createUpload,
  signPart,
  completeUpload,
  abortUpload,
  head,
  readHeader,
  deleteObject,
  cleanupObject,
  putObject,
];

beforeEach(() => {
  for (const fn of allMocks) fn.mockClear();
  findUser.mockResolvedValue({ id: "submitter", isAdmin: false });
  findVideo.mockResolvedValue(null);
  findPending.mockResolvedValue(null);
  loadAuth.mockResolvedValue({ userId: "clerk-user" });
  saveVideo.mockResolvedValue(receipt);
  completeUpload.mockResolvedValue(true);
  head.mockResolvedValue({ size: 27, contentType: "video/mp4" });
  readHeader.mockResolvedValue(
    new Uint8Array([0, 0, 0, 20, ...new TextEncoder().encode("ftypisom")]),
  );
  errorSpy.mockClear();
});

afterAll(() => {
  errorSpy.mockRestore();
});

function savedData() {
  return (saveVideo.mock.calls[0][0] as { data: Record<string, unknown> }).data;
}

describe("POST /api/uploads", () => {
  test("signs one part URL per chunk under the submitter's own prefix", async () => {
    const size = VIDEO_PART_BYTES * 2 + 1;
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "video",
        size,
        contentType: "video/mp4",
      }),
    );
    expect(response.status).toBe(201);
    const { upload: started } = await response.json();
    expect(started.key).toMatch(/^videos\/submitter\/[0-9a-f-]{36}\.mp4$/);
    expect(started.partSize).toBe(VIDEO_PART_BYTES);
    expect(started.parts.map((part: { partNumber: number }) => part.partNumber))
      .toEqual([1, 2, 3]);
    expect(createUpload.mock.calls[0][1]).toBe("video/mp4");
  });

  test("keeps sponsor videos apart from catalogue videos", async () => {
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "sponsor",
        size: 10,
        contentType: "video/webm",
      }),
    );
    const { upload: started } = await response.json();
    expect(started.key).toMatch(/^sponsors\/videos\/submitter\/.+\.webm$/);
  });

  test("rejects videos over the limit before creating anything", async () => {
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "video",
        size: MAX_VIDEO_BYTES + 1,
        contentType: "video/mp4",
      }),
    );
    expect(response.status).toBe(413);
    expect(createUpload).not.toHaveBeenCalled();
  });

  test("rejects unsupported types", async () => {
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "video",
        size: 10,
        contentType: "application/zip",
      }),
    );
    expect(response.status).toBe(415);
    expect(createUpload).not.toHaveBeenCalled();
  });

  test("requires a signed-in user", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "video",
        size: 10,
        contentType: "video/mp4",
      }),
    );
    expect(response.status).toBe(401);
    expect(createUpload).not.toHaveBeenCalled();
  });
});

describe("POST /api/uploads/abort", () => {
  test("aborts the caller's own upload", async () => {
    const response = await ABORT(
      json("http://localhost/api/uploads/abort", {
        key: KEY,
        uploadId: "upload-id",
      }),
    );
    expect(response.status).toBe(204);
    expect(abortUpload).toHaveBeenCalledTimes(1);
  });

  test("refuses someone else's upload", async () => {
    const response = await ABORT(
      json("http://localhost/api/uploads/abort", {
        key: KEY.replace("submitter", "someone-else"),
        uploadId: "upload-id",
      }),
    );
    expect(response.status).toBe(403);
    expect(abortUpload).not.toHaveBeenCalled();
  });
});

describe("POST /api/videos", () => {
  test("completes the upload and saves the R2 object", async () => {
    const response = await POST(submission());
    expect(response.status).toBe(201);
    expect(await response.json()).toHaveProperty("video.id", "video-id");
    expect(completeUpload.mock.calls[0]).toEqual([
      KEY,
      "upload-id",
      upload.parts,
    ]);
    expect(savedData()).toMatchObject({
      submittedById: "submitter",
      creatorName: "Other creator",
      creatorXUrl: metadata.creatorXUrl,
      promptText: metadata.promptText,
      storageKey: KEY,
      videoUrl: `https://media.example.invalid/${KEY}`,
      durationSeconds: 12,
      reviewStatus: "PENDING_REVIEW",
      publishedAt: null,
      reviewedById: null,
    });
    expect(savedData()).not.toHaveProperty("imagekitFileId");
  });

  test("stores up to three fixed tags", async () => {
    const tags = ["cinematic", "glitch", "analog"];
    expect((await POST(submission({ tags }))).status).toBe(201);
    expect(savedData().tags).toEqual(tags);
  });

  test.each([
    ["cinematic", "glitch", "analog", "pastel"],
    ["cinematic", "cinematic"],
    ["made-up-tag"],
  ])("rejects invalid tag selection %j", async (...tags) => {
    expect((await POST(submission({ tags }))).status).toBe(400);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("uses database admin status to approve and publish immediately", async () => {
    findUser.mockResolvedValue({ id: "submitter", isAdmin: true });
    expect(
      (await POST(submission({ isFeatured: true, curatorNotes: "Curated" })))
        .status,
    ).toBe(201);
    expect(savedData()).toMatchObject({
      reviewStatus: "APPROVED",
      reviewedById: "submitter",
      isFeatured: true,
      curatorNotes: "Curated",
    });
    expect(savedData().publishedAt).toBeInstanceOf(Date);
  });

  test("rejects unauthenticated submissions before touching storage", async () => {
    loadAuth.mockResolvedValue({ userId: null });
    expect((await POST(submission())).status).toBe(401);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("provisions a first-time submitter without granting admin", async () => {
    findUser.mockResolvedValue(null);
    upsertUser.mockResolvedValue({ id: "submitter", isAdmin: false });
    expect((await POST(submission())).status).toBe(201);
    expect(upsertUser.mock.calls[0][0]).toMatchObject({
      create: { clerkId: "clerk-user", email: "creator@example.invalid" },
      update: {},
    });
    expect(savedData()).toMatchObject({ reviewStatus: "PENDING_REVIEW" });
  });

  test.each([
    "isAdmin",
    "reviewStatus",
    "submittedById",
    "videoUrl",
    "publishedAt",
  ])("rejects client-controlled %s", async (field) => {
    expect((await POST(submission({ [field]: "spoofed" }))).status).toBe(400);
    expect(completeUpload).not.toHaveBeenCalled();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test.each([{ isFeatured: true }, { curatorNotes: "Unauthorized" }])(
    "rejects admin-only metadata %j",
    async (fields) => {
      expect((await POST(submission(fields))).status).toBe(403);
      expect(completeUpload).not.toHaveBeenCalled();
    },
  );

  test.each([
    { category: "unknown" },
    { creatorXUrl: "https://example.com/fake" },
    { promptText: "  " },
    { title: "" },
  ])("rejects invalid metadata %j, leaving the parts for a retry", async (fields) => {
    expect((await POST(submission(fields))).status).toBe(400);
    expect(completeUpload).not.toHaveBeenCalled();
    expect(cleanupObject).not.toHaveBeenCalled();
  });

  test("refuses to finish another user's upload", async () => {
    const response = await POST(
      submission({}, { key: KEY.replace("submitter", "someone-else") }),
    );
    expect(response.status).toBe(403);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test.each([
    [{ parts: [] }],
    [{ parts: [{ partNumber: 2, etag: "x" }] }],
    [{ key: "../escape.mp4" }],
  ])("rejects a malformed upload reference %j", async (overrides) => {
    const response = await POST(submission({}, overrides));
    expect([400, 403]).toContain(response.status);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("deletes a stored file whose bytes are not a video", async () => {
    readHeader.mockResolvedValue(new TextEncoder().encode("not a video!"));
    expect((await POST(submission())).status).toBe(415);
    expect(cleanupObject).toHaveBeenCalledWith(KEY);
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("deletes a stored file larger than the limit", async () => {
    head.mockResolvedValue({ size: MAX_VIDEO_BYTES + 1, contentType: "video/mp4" });
    expect((await POST(submission())).status).toBe(413);
    expect(cleanupObject).toHaveBeenCalledWith(KEY);
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("asks for a fresh upload when R2 no longer has it", async () => {
    completeUpload.mockResolvedValue(false);
    head.mockResolvedValue(null);
    expect((await POST(submission())).status).toBe(410);
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("answers a retried submission without touching storage", async () => {
    findVideo.mockResolvedValue({ id: "video-id" });
    expect((await POST(submission())).status).toBe(409);
    expect(completeUpload).not.toHaveBeenCalled();
    expect(cleanupObject).not.toHaveBeenCalled();
  });

  test("never deletes the file when a concurrent duplicate saved it first", async () => {
    saveVideo.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), {
        code: "P2002",
        meta: { target: ["storageKey"] },
      }),
    );
    expect((await POST(submission())).status).toBe(409);
    expect(cleanupObject).not.toHaveBeenCalled();
  });

  test("deletes the uploaded file when persistence fails, without leaking details", async () => {
    saveVideo.mockRejectedValueOnce(new Error("database-private-details"));
    const response = await POST(submission());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("database-private-details");
    expect(cleanupObject).toHaveBeenCalledWith(KEY);
  });

  test("re-encodes the poster frame as WebP beside the video and records its shape", async () => {
    const response = await POST(submission({}, {}, { poster: POSTER }));
    expect(response.status).toBe(201);
    const [key, body, type] = putObject.mock.calls[0];
    expect(key).toBe(POSTER_KEY);
    expect(type).toBe("image/webp");
    const stored = await sharp(body).metadata();
    expect(stored).toMatchObject({ format: "webp", width: 720, height: 405 });
    expect(savedData()).toMatchObject({ posterKey: POSTER_KEY });
    expect(savedData().aspectRatio as number).toBeCloseTo(16 / 9, 2);
  });

  test("saves the video without a poster when the frame is not an image", async () => {
    const garbage = Buffer.from("not an image at all").toString("base64");
    const response = await POST(submission({}, {}, { poster: garbage }));
    expect(response.status).toBe(201);
    expect(putObject).not.toHaveBeenCalled();
    expect(savedData()).toMatchObject({ posterKey: null, aspectRatio: null });
  });

  test("rejects a malformed poster field before touching storage", async () => {
    const response = await POST(submission({}, {}, { poster: "<svg>" }));
    expect(response.status).toBe(400);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("removes the stored poster too when persistence fails", async () => {
    saveVideo.mockRejectedValueOnce(new Error("database down"));
    const response = await POST(submission({}, {}, { poster: POSTER }));
    expect(response.status).toBe(500);
    expect(cleanupObject).toHaveBeenCalledWith(KEY);
    expect(cleanupObject).toHaveBeenCalledWith(POSTER_KEY);
  });

  test("rejects multipart bodies; videos no longer pass through the server", async () => {
    const form = new FormData();
    form.set("metadata", JSON.stringify(metadata));
    const response = await POST(
      new Request("http://localhost/api/videos", { method: "POST", body: form }),
    );
    expect(response.status).toBe(415);
  });

  test("rejects oversized requests before parsing", async () => {
    const request = submission();
    request.headers.set("content-length", String(2_000_000));
    expect((await POST(request)).status).toBe(413);
    expect(completeUpload).not.toHaveBeenCalled();
  });
});

describe("upload limits and bans", () => {
  const start = () =>
    START(
      json("http://localhost/api/uploads", {
        purpose: "video",
        size: 10,
        contentType: "video/mp4",
      }),
    );

  test("one video at a time: a pending review blocks the next upload before R2", async () => {
    findPending.mockResolvedValue({ id: "earlier" });
    const response = await start();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "REVIEW_PENDING" });
    expect(findPending.mock.calls[0][0]).toMatchObject({
      where: { submittedById: "submitter", reviewStatus: "PENDING_REVIEW" },
    });
    expect(createUpload).not.toHaveBeenCalled();
  });

  test("re-checks at submit, so two uploads started side by side cannot both land", async () => {
    findPending.mockResolvedValue({ id: "other-tab" });
    const response = await POST(submission());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "REVIEW_PENDING" });
    expect(completeUpload).not.toHaveBeenCalled();
    expect(saveVideo).not.toHaveBeenCalled();
  });

  test("admins publish immediately and are never limited", async () => {
    findUser.mockResolvedValue({ id: "submitter", isAdmin: true });
    findPending.mockResolvedValue({ id: "earlier" });
    expect((await start()).status).toBe(201);
  });

  test("sponsor videos are not held by a pending catalogue video", async () => {
    findPending.mockResolvedValue({ id: "earlier" });
    const response = await START(
      json("http://localhost/api/uploads", {
        purpose: "sponsor",
        size: 10,
        contentType: "video/mp4",
      }),
    );
    expect(response.status).toBe(201);
  });

  test("an upload ban stops uploads but not the account", async () => {
    findUser.mockResolvedValue({ id: "submitter", isAdmin: false, uploadBanned: true });
    const response = await start();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "UPLOAD_BANNED" });
    expect(createUpload).not.toHaveBeenCalled();
    expect((await POST(submission())).status).toBe(403);
    expect(completeUpload).not.toHaveBeenCalled();
  });

  test("a full ban refuses every protected API, admins included", async () => {
    findUser.mockResolvedValue({ id: "submitter", isAdmin: true, banned: true });
    for (const response of [
      await start(),
      await POST(submission()),
      await ABORT(
        json("http://localhost/api/uploads/abort", { key: KEY, uploadId: "upload-id" }),
      ),
    ]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "ACCOUNT_BANNED" });
    }
    expect(createUpload).not.toHaveBeenCalled();
    expect(abortUpload).not.toHaveBeenCalled();
  });
});
