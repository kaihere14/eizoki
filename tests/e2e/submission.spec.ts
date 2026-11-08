import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/nextjs/server";

const email = `eizoki-submit-${Date.now()}+clerk_test@example.com`;
const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
let clerkId: string;

test.beforeAll(async () => {
  const user = await client.users.createUser({
    emailAddress: [email],
    firstName: "Motion",
    lastName: "Maker",
    skipPasswordRequirement: true,
  });
  clerkId = user.id;
});
test.afterAll(async () => {
  if (clerkId) await client.users.deleteUser(clerkId);
});

async function openSubmission(page: Page, admin = false) {
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "test-user",
          clerkId,
          email,
          firstName: "Motion",
          lastName: "Maker",
          username: null,
          avatar: "BOY",
          isAdmin: admin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Submit a video" }),
  ).toBeVisible();
}

async function fillSubmission(page: Page) {
  await page.getByLabel("Upload video", { exact: true }).setInputFiles({
    name: "motion.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("\x00\x00\x00\x20ftypisomtest-video-data"),
  });
  await page.getByLabel("Video title", { exact: true }).fill("Light study");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("ai-motion-design");
  await page
    .getByLabel("Creator name", { exact: true })
    .fill("Original creator");
}

function receipt(approved = false) {
  return {
    video: {
      id: "video-id",
      slug: "light-study",
      title: "Light study",
      reviewStatus: approved ? "APPROVED" : "PENDING_REVIEW",
      publishedAt: approved ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    },
  };
}

test("opens over the existing page, keeps the navbar, traps focus, and restores browsing", async ({
  page,
}) => {
  await openSubmission(page);
  const url = page.url();
  await expect(page.getByLabel("Video title", { exact: true })).toBeFocused();
  // Native modal behavior keeps keyboard interaction inside the form.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close submission" }),
  ).toBeFocused();
  await page.screenshot({ path: "test-results/submission-desktop.png" });
  expect(
    await page.locator("body").evaluate((body) => body.style.overflow),
  ).toBe("hidden");
  expect(await page.locator("body > header").boundingBox()).toMatchObject({
    y: 0,
  });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((dialog) => dialog.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(52);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeFocused();
  expect(page.url()).toBe(url);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(page.locator("body > header")).toBeInViewport();
  expect(await page.locator("body > header").boundingBox()).toMatchObject({
    y: 0,
  });
});

test("submits only necessary metadata and confirms community review", async ({
  page,
}) => {
  await openSubmission(page);
  let payload: Record<string, unknown> = {};
  await page.route("**/api/videos", async (route) => {
    const data = await new Response(
      Uint8Array.from(route.request().postDataBuffer()!),
      {
        headers: { "content-type": route.request().headers()["content-type"] },
      },
    ).formData();
    expect(data.get("file")).toBeInstanceOf(File);
    payload = JSON.parse(String(data.get("metadata")));
    await route.fulfill({ status: 201, json: receipt() });
  });
  await fillSubmission(page);
  await page.getByRole("button", { name: "Add tag", exact: true }).click();
  await page
    .getByRole("group", { name: "Available tags" })
    .getByRole("button", { name: "Cinematic", exact: true })
    .click();
  await page.getByLabel("Video title", { exact: true }).click();
  await page.getByLabel("X profile", { exact: false }).fill("@originalcreator");
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^Prompt/ })
    .fill("  Preserve this prompt.\n");
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanks for sharing" }),
  ).toBeVisible();
  expect(payload).toMatchObject({
    tags: ["cinematic"],
    title: "Light study",
    creatorName: "Original creator",
    creatorXUrl: "https://x.com/originalcreator",
    promptText: "  Preserve this prompt.\n",
    promptStatus: "ORIGINAL",
  });
  for (const key of [
    "isAdmin",
    "reviewStatus",
    "thumbnailUrl",
    "width",
    "height",
  ])
    expect(payload).not.toHaveProperty(key);
  await page.getByRole("button", { name: "Back to browsing" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("fixed tag pills support adding, removing, the three-tag cap, and Escape", async ({
  page,
}) => {
  await openSubmission(page);
  const dialog = page.getByRole("dialog");
  const add = dialog.getByRole("button", { name: "Add tag", exact: true });
  await expect(add).toHaveCSS("border-top-style", "dashed");
  await add.click();
  const options = dialog.getByRole("group", { name: "Available tags" });
  for (const label of ["Cinematic", "Glitch", "Analog"]) {
    await options.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(options).toHaveCount(0);
  await expect(add).toHaveAttribute("aria-disabled", "true");
  await expect(dialog.getByText("3/3", { exact: true })).toBeVisible();
  await expect(dialog.locator('input[name="tags"]')).toHaveCount(3);
  await dialog
    .getByRole("button", { name: "Remove Glitch tag", exact: true })
    .click();
  await expect(add).toHaveAttribute("aria-disabled", "false");
  await expect(dialog.locator('input[name="tags"]')).toHaveCount(2);
  await add.click();
  await expect(
    options.getByRole("button", { name: "Glitch", exact: true }),
  ).toBeVisible();
  await expect(
    options.getByRole("button", { name: "Cinematic", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(add).toBeFocused();
  await add.click();
  await options.getByRole("button", { name: "Pastel", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Remove Pastel tag", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/submission-tags-desktop.png" });
});

test("preserves input after errors and prevents duplicate submissions while uploading", async ({
  page,
}) => {
  await openSubmission(page);
  await fillSubmission(page);
  let attempts = 0;
  let finish: (() => void) | undefined;
  const release = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/videos", async (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        json: { error: "Uploads are not configured yet." },
      });
    await release;
    await route.fulfill({ status: 201, json: receipt() });
  });
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Uploads are not configured yet.",
  );
  await expect(page.getByLabel("Video title", { exact: true })).toHaveValue(
    "Light study",
  );
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Uploading your video…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Close submission" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  finish?.();
  await expect(
    page.getByRole("heading", { name: "Thanks for sharing" }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});

test("shows admin publishing controls and the publication outcome", async ({
  page,
}) => {
  await openSubmission(page, true);
  await page.route("**/api/videos", (route) =>
    route.fulfill({ status: 201, json: receipt(true) }),
  );
  await fillSubmission(page);
  await page.getByText("More details", { exact: false }).click();
  await page.getByLabel("Feature this video").check();
  await page
    .getByRole("button", { name: "Publish video", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your video is published" }),
  ).toBeVisible();
});

test("fits mobile, respects the pink theme, and closes without navigating", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("eizoki:theme", "pink"));
  await openSubmission(page);
  await page.getByRole("button", { name: "Add tag", exact: true }).click();
  for (const label of ["Material study", "Audio reactive", "Product launch"]) {
    await page
      .getByRole("group", { name: "Available tags" })
      .getByRole("button", { name: label, exact: true })
      .click();
  }
  await page.mouse.move(0, 0);
  await expect(
    page.getByRole("button", { name: "Add tag", exact: true }),
  ).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/submission-mobile.png",
  });
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--brand-500")
        .trim(),
    ),
  ).toBe("#d6336c");
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(
    page.getByRole("button", { name: /Drop your video here/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close submission" }).click();
  expect(new URL(page.url()).pathname).toBe("/");
});
