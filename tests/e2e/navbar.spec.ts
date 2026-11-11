import { test, expect, type Page } from "@playwright/test";

const GITHUB_LABEL = "Eizoki on GitHub (opens in a new tab)";

async function headerBottom(page: Page) {
  return page.locator("header").evaluate((header) =>
    header.getBoundingClientRect().bottom,
  );
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  test.describe(`navbar at ${viewport.width}px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/videos?*", (route) =>
        route.fulfill({ json: { videos: [], nextCursor: null } }),
      );
      await page.goto("/");
      await expect(
        page.getByRole("button", { name: "Submit", exact: true }),
      ).toBeVisible();
      // A stable scroll surface keeps these checks independent of the catalogue.
      await page.locator("main").evaluate((main) => {
        main.style.minHeight = "3200px";
      });
    });

    test("GitHub is the far-right link and opens the project in a new tab", async ({ page }) => {
      const github = page.getByRole("link", { name: GITHUB_LABEL });
      await expect(github).toBeVisible();
      await expect(github).toHaveAttribute(
        "href",
        "https://github.com/kaihere14/eizoki",
      );
      await expect(github).toHaveAttribute("target", "_blank");
      await expect(github).toHaveAttribute("rel", "noopener noreferrer");
      const box = await github.boundingBox();
      const submitBox = await page
        .getByRole("button", { name: "Submit", exact: true })
        .boundingBox();
      expect(box!.x).toBeGreaterThan(submitBox!.x + submitBox!.width);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
    });

    test("hides down, reveals up, and stays visible near the top", async ({ page }) => {
      await expect.poll(() => headerBottom(page)).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo(0, 500));
      await expect.poll(() => headerBottom(page)).toBeLessThanOrEqual(0);
      await page.evaluate(() => window.scrollTo(0, 400));
      await expect.poll(() => headerBottom(page)).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo(0, 700));
      await expect.poll(() => headerBottom(page)).toBeLessThanOrEqual(0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => headerBottom(page)).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo(0, 20));
      await expect.poll(() => headerBottom(page)).toBeGreaterThan(0);
    });

    test("keyboard focus reveals the hidden navbar and reduced motion removes its transition", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => window.scrollTo(0, 500));
      await expect.poll(() => headerBottom(page)).toBeLessThanOrEqual(0);
      await page.getByRole("link", { name: GITHUB_LABEL }).evaluate((link) =>
        link.focus({ preventScroll: true }),
      );
      await expect.poll(() => headerBottom(page)).toBeGreaterThan(0);
      expect(
        await page.locator("header").evaluate((header) =>
          getComputedStyle(header).transitionProperty,
        ),
      ).toBe("none");
      expect(await page.evaluate(() => window.scrollY)).toBe(500);
    });
  });
}
