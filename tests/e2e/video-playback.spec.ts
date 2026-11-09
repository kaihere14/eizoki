import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const fixture = path.resolve("tests/fixtures/playback.webm");

async function openFeed(
  page: Page,
  failed = false,
  attribution?: {
    xProfileUrl?: string;
    profileUrl?: string;
    handle?: string;
    sourceUrl?: string;
    promptText?: string | null;
    avatarUrl?: string;
  },
) {
  await page.route("**/api/videos?*", (route) =>
    route.fulfill({
      json: {
        videos: Array.from({ length: failed ? 1 : 40 }, (_, index) => ({
          id: `viewport-${index}`,
          slug: `viewport-${index}`,
          title: `Viewport ${index}`,
          category: "ai-motion-design",
          tags: [],
          aspectRatio: 4 / 3,
          videoUrl: new URL("/playback-fixture.webm", route.request().url())
            .href,
          creator: {
            name: "Creator",
            avatarUrl: attribution?.avatarUrl,
            xProfileUrl: attribution?.xProfileUrl,
            profileUrl: attribution?.profileUrl,
            handle: attribution?.handle,
          },
          sourceUrl: attribution?.sourceUrl,
          promptStatus:
            attribution?.promptText === null ? "unavailable" : "original",
          promptText:
            attribution?.promptText === null
              ? undefined
              : (attribution?.promptText ?? "  A cinematic camera move.\n"),
          publishedAt: "2026-11-01T00:00:00.000Z",
        })),
        nextCursor: null,
      },
    }),
  );
  await page.route("**/playback-fixture.webm", (route) =>
    failed
      ? route.fulfill({ status: 404, body: "Not found" })
      : route.fulfill({ path: fixture, contentType: "video/webm" }),
  );
  await page.goto("/");
  const card = page.getByRole("button", {
    name: "Preview Viewport 0 by Creator",
    exact: true,
  });
  await expect(card).toBeVisible();
  return card;
}

test("visible videos play without hover, pause outside the viewport, and resume on return", async ({
  page,
}) => {
  const card = await openFeed(page);
  const video = card.locator("video");
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0.1);
  await expect(card).not.toHaveClass(/skeleton-shimmer/);
  expect(
    await video.evaluate((element: HTMLVideoElement) => ({
      muted: element.muted,
      loop: element.loop,
      inline: element.playsInline,
    })),
  ).toEqual({ muted: true, loop: true, inline: true });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  const lastVideo = page
    .getByRole("button", {
      name: "Preview Viewport 39 by Creator",
      exact: true,
    })
    .locator("video");
  await expect
    .poll(() =>
      lastVideo.evaluate((element: HTMLVideoElement) => element.paused),
    )
    .toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(false);
});

test("loaded previews stop shimmering and copied prompts include the video reference", async ({
  page,
  context,
}) => {
  const card = await openFeed(page);
  const backgroundVideo = card.locator("video");
  await expect
    .poll(() =>
      backgroundVideo.evaluate((element: HTMLVideoElement) => element.paused),
    )
    .toBe(false);
  await card.click();
  const dialog = page.getByRole("dialog");
  const player = dialog.locator("video").first();
  await expect
    .poll(() =>
      player.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await player.evaluate((element: HTMLVideoElement) => ({
      muted: element.muted,
      volume: element.volume,
    })),
  ).toEqual({ muted: false, volume: 1 });
  await expect(player.locator("..")).not.toHaveClass(/skeleton-shimmer/);
  await expect
    .poll(() =>
      backgroundVideo.evaluate((element: HTMLVideoElement) => element.paused),
    )
    .toBe(true);
  await expect(
    dialog.getByRole("link", { name: "Reference video", exact: true }),
  ).toHaveAttribute("href", "/api/videos/viewport-0/reference");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await dialog
    .getByRole("button", { name: "Copy prompt", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `  A cinematic camera move.\n\n\nPlease use this video as the reference:\n${new URL(page.url()).origin}/api/videos/viewport-0/reference`,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() =>
      backgroundVideo.evaluate((element: HTMLVideoElement) => element.paused),
    )
    .toBe(false);
});

test("failed media stops shimmering and shows the player error", async ({
  page,
}) => {
  const card = await openFeed(page, true);
  await expect(card).not.toHaveClass(/skeleton-shimmer/);
  await card.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("This video could not be played."),
  ).toBeVisible();
  await expect(dialog.locator("video").first().locator("..")).not.toHaveClass(
    /skeleton-shimmer/,
  );
});

test("preview uses the uploader's selected site avatar instead of initials", async ({
  page,
}) => {
  const card = await openFeed(page, false, {
    avatarUrl: "/avatars/female-transparent.png",
  });
  await card.click();
  const avatar = page
    .getByRole("dialog")
    .getByRole("img", { name: "Uploader avatar", exact: true });
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("src", /female-transparent/);
  await expect
    .poll(() =>
      avatar.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
});

for (const sourceUrl of [undefined, "https://x.com/creator/status/123"]) {
  test(`copy prompt stays pink and copies a reference without shared text ${sourceUrl ? "with" : "without"} an original post`, async ({
    page,
    context,
  }) => {
    // The colour assertions below are for the light canvas; dark is the default.
    await page.addInitScript(() => localStorage.setItem("eizoki:mode", "light"));
    const card = await openFeed(page, false, { promptText: null, sourceUrl });
    await card.click();
    const dialog = page.getByRole("dialog");
    const copy = dialog.getByRole("button", {
      name: "Copy prompt",
      exact: true,
    });
    await expect(copy).toBeVisible();
    await expect(copy).toHaveCSS("background-color", "rgb(214, 51, 108)");
    const original = dialog.getByRole("link", {
      name: "View original",
      exact: true,
    });
    if (sourceUrl)
      await expect(original).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
    else await expect(original).toHaveCount(0);
    await expect(
      dialog.getByRole("link", { name: "Reference video", exact: true }),
    ).toBeVisible();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `Please use this video as the reference:\n${new URL(page.url()).origin}/api/videos/viewport-0/reference`,
    );
    await expect(
      dialog.getByRole("button", { name: "Prompt copied", exact: true }),
    ).toBeVisible();
  });
}

test("only clicks outside the video and sidebar dismiss the preview", async ({
  page,
}) => {
  const card = await openFeed(page);
  const url = page.url();
  await card.click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("heading", { name: "Viewport 0", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  const player = dialog.locator("video").first();
  await player.click({ position: { x: 30, y: 30 } });
  await expect(dialog).toBeVisible();
  // Empty padding belongs to the backdrop, not the player hit area.
  await player
    .locator("..")
    .locator("..")
    .click({ position: { x: 4, y: 10 } });
  await expect(dialog).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(card).toBeVisible();
});

for (const [name, sourceUrl, hasOriginal] of [
  ["no submitted source", undefined, false],
  ["a distinct original post", "https://x.com/actualcreator/status/123", true],
  ["the account repeated as the source", "https://x.com/actualcreator/", false],
] as const) {
  test(`creator attribution uses the correct links with ${name}`, async ({
    page,
  }) => {
    const card = await openFeed(page, false, {
      xProfileUrl: "https://x.com/actualcreator",
      profileUrl: "https://creator.example.com",
      handle: "@actualcreator",
      sourceUrl,
    });
    await card.click();
    const dialog = page.getByRole("dialog");
    const nameLabel = dialog.getByText("Creator", { exact: true }).first();
    expect(
      await nameLabel.evaluate((element) => element.closest("a")),
    ).toBeNull();
    expect(await nameLabel.locator("..").textContent()).not.toContain(
      "@actualcreator",
    );
    const xLink = dialog.getByRole("link", { name: /Open on X/ });
    await expect(xLink).toHaveAttribute("href", "https://x.com/actualcreator");
    await expect(xLink).toContainText("@actualcreator");
    const original = dialog.getByRole("link", {
      name: "View original",
      exact: true,
    });
    if (hasOriginal) await expect(original).toHaveAttribute("href", sourceUrl!);
    else await expect(original).toHaveCount(0);
    await expect(
      dialog.getByRole("link", { name: "Creator", exact: true }),
    ).toHaveCount(0);
  });
}
