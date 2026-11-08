import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/nextjs/server";
import path from "node:path";

const email = `eizoki-my-videos-${Date.now()}+clerk_test@example.com`;
const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
let clerkId: string;
test.beforeAll(async () => {
  clerkId = (
    await client.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    })
  ).id;
});
test.afterAll(async () => {
  if (clerkId) await client.users.deleteUser(clerkId);
});

function uploads() {
  return ["PENDING_REVIEW", "APPROVED", "REJECTED"].map(
    (reviewStatus, index) => ({
      id: `mine-${index}`,
      slug: `mine-${index}`,
      title: `My upload ${index}`,
      category: "ai-motion-design",
      tags: [],
      creator: { name: "External creator" },
      promptStatus: "unavailable",
      videoUrl: "/owned-fixture.webm",
      aspectRatio: 4 / 3,
      reviewStatus,
      publishedAt:
        reviewStatus === "APPROVED" ? "2026-01-01T00:00:00.000Z" : undefined,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  );
}

async function signedIn(page: Page) {
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "owner",
          clerkId,
          email,
          firstName: null,
          lastName: null,
          username: null,
          avatar: "BOY",
          isAdmin: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  );
  await page.route("**/api/videos?*", (route) =>
    route.fulfill({ json: { videos: [], nextCursor: null } }),
  );
  await page.route("**/owned-fixture.webm", (route) =>
    route.fulfill({
      path: path.resolve("tests/fixtures/playback.webm"),
      contentType: "video/webm",
    }),
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
}

test("navbar replaces Info with My Videos and displays all owned review states", async ({
  page,
}) => {
  await page.route("**/api/videos/mine?*", (route) =>
    route.fulfill({ json: { videos: uploads(), nextCursor: null } }),
  );
  await signedIn(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  await expect(
    nav.getByRole("link", { name: "Info", exact: true }),
  ).toHaveCount(0);
  expect(await nav.getByRole("link").allTextContents()).toEqual([
    "My Videos",
    "Favourites",
  ]);
  await nav.getByRole("link", { name: "My Videos", exact: true }).click();
  await expect(page).toHaveURL(/\/my-videos$/);
  for (const status of ["Pending review", "Published", "Rejected"])
    await expect(page.getByText(status, { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Preview My upload 0 by External creator",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "My upload 0", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    nav.getByRole("link", { name: "My Videos", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator("body > header")
      .evaluate((header) => header.scrollWidth <= header.clientWidth),
  ).toBe(true);
});

test("deletion requires confirmation and removes the video after success", async ({
  page,
}) => {
  let videos = uploads();
  let calls = 0;
  await page.route("**/api/videos/mine?*", (route) =>
    route.fulfill({ json: { videos, nextCursor: null } }),
  );
  await page.route("**/api/videos/mine-0", (route) => {
    expect(route.request().method()).toBe("DELETE");
    calls++;
    videos = videos.filter((video) => video.id !== "mine-0");
    return route.fulfill({ status: 204 });
  });
  await signedIn(page);
  await page.getByRole("link", { name: "My Videos", exact: true }).click();
  const remove = page.getByRole("button", {
    name: "Delete My upload 0",
    exact: true,
  });
  await remove.click();
  const dialog = page.getByRole("dialog", { name: "Delete this video?" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(calls).toBe(0);
  await expect(remove).toBeVisible();
  await remove.click();
  await dialog
    .getByRole("button", { name: "Delete video", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(remove).toHaveCount(0);
  await expect(page.getByText("Video deleted.", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await expect(
    page.getByRole("heading", { name: "My upload 1", exact: true }),
  ).toBeVisible();
});

test("failed deletions retain the video and allow retry", async ({ page }) => {
  let videos = uploads();
  let attempts = 0;
  await page.route("**/api/videos/mine?*", (route) =>
    route.fulfill({ json: { videos, nextCursor: null } }),
  );
  await page.route("**/api/videos/mine-0", (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 502,
        json: {
          error: "The video file could not be deleted. Please try again.",
        },
      });
    videos = videos.filter((video) => video.id !== "mine-0");
    return route.fulfill({ status: 204 });
  });
  await signedIn(page);
  await page.getByRole("link", { name: "My Videos", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete My upload 0", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Delete this video?" });
  await dialog
    .getByRole("button", { name: "Delete video", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("could not be deleted");
  await expect(
    page.getByRole("heading", { name: "My upload 0", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Delete video", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("signed-out visitors are asked to sign in without fetching private data", async ({
  page,
}) => {
  let requested = false;
  await page.route("**/api/videos/mine?*", (route) => {
    requested = true;
    return route.fulfill({ status: 401 });
  });
  await page.goto("/my-videos");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(requested).toBe(false);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Log in to Eizoki" }),
  ).toBeVisible();
});
