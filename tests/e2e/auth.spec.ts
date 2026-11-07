import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/nextjs/server";

// Reserved development-only email: Clerk never sends a message to this address.
const email = `eizoki-e2e-${Date.now()}+clerk_test@example.com`;
const continuationEmail = `eizoki-continuation-${Date.now()}+clerk_test@example.com`;
const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

test.afterAll(async () => {
  const { data } = await client.users.getUserList({
    emailAddress: [email, continuationEmail],
  });
  for (const user of data) {
    if (
      user.emailAddresses.some((address) =>
        [email, continuationEmail].includes(address.emailAddress),
      )
    )
      await client.users.deleteUser(user.id);
  }
});

test("custom email signup, session persistence, signout and returning-user login", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await page.goto("/?auth-test=return");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Log in to Eizoki" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Continue with email", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("valid email");
  await dialog.getByLabel("Email address", { exact: true }).fill(email);
  await dialog
    .getByRole("button", { name: "Continue with email", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Resend in/ }),
  ).toBeDisabled();
  await dialog.getByLabel("Verification code", { exact: true }).fill("000000");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(
    dialog.getByText("0 of 6 digits entered", { exact: true }),
  ).toHaveCount(1);
  // Paste sanitizes separators and automatically submits the complete code once.
  await dialog
    .getByLabel("Verification code", { exact: true })
    .evaluate((input) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text", "424 242");
      input.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(dialog.getByText("Code accepted", { exact: true })).toHaveCount(
    1,
  );
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/auth-test=return/);
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).not.toBeVisible();

  await page.reload();
  const account = page.getByRole("button", { name: "Account menu" });
  await expect(account).toBeVisible();
  await expect(account.locator("img")).toHaveAttribute(
    "src",
    /male-transparent\.png/,
  );
  await account.click();
  await expect(
    page.getByRole("button", { name: "Male avatar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Female avatar", exact: true })
    .click();
  await expect(page.getByText("Avatar updated", { exact: true })).toBeVisible();
  await expect(account.locator("img")).toHaveAttribute(
    "src",
    /female-transparent\.png/,
  );
  await page.reload();
  await expect(account.locator("img")).toHaveAttribute(
    "src",
    /female-transparent\.png/,
  );
  await account.click();
  await expect(
    page.getByRole("button", { name: "Female avatar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Login", exact: true }).click();
  await dialog.getByLabel("Email address", { exact: true }).fill(email);
  await dialog
    .getByRole("button", { name: "Continue with email", exact: true })
    .click();
  const otp = dialog.getByLabel("Verification code", { exact: true });
  await otp.pressSequentially("12");
  await otp.press("ArrowLeft");
  await otp.press("Backspace");
  await otp.press("Home");
  await otp.press("Delete");
  await expect(
    dialog.getByText("0 of 6 digits entered", { exact: true }),
  ).toHaveCount(1);
  await otp.pressSequentially("424242");
  await expect(dialog).not.toBeVisible();
  await expect(account).toBeVisible();
  await expect(account.locator("img")).toHaveAttribute(
    "src",
    /female-transparent\.png/,
  );
});

test("mobile dialog dismissal, focus return and Submit trigger", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const login = page.getByRole("button", { name: "Login", exact: true });
  await login.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(login).toBeFocused();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close login" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

for (const provider of ["Google", "X"]) {
  test(`${provider} redirects to its OAuth provider`, async ({ page }) => {
    await setupClerkTestingToken({ page });
    const handoff = page.waitForRequest(
      (request) =>
        request.isNavigationRequest() &&
        /^(accounts\.google\.com|x\.com|twitter\.com)$/.test(
          new URL(request.url()).hostname,
        ),
    );
    await page.route(
      /https:\/\/(accounts\.google\.com|x\.com|twitter\.com)\//,
      (route) => route.fulfill({ status: 200, body: "OAuth handoff verified" }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page
      .getByRole("button", { name: `Continue with ${provider}`, exact: true })
      .click();
    const request = await handoff;
    expect(new URL(request.url()).hostname).toMatch(
      provider === "Google" ? /google/ : /x\.com|twitter/,
    );
  });
}

test("OAuth-style signup continuation collects and verifies a missing email", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  // Start a real pending signup with no identifier, as an OAuth callback can return.
  await page.evaluate(async () => {
    const clerkWindow = window as unknown as {
      Clerk: {
        client: { signUp: { create: (params: object) => Promise<unknown> } };
      };
    };
    await clerkWindow.Clerk.client.signUp.create({});
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in/continue");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Complete your account" }),
  ).toBeVisible();
  await dialog
    .getByLabel("Email address", { exact: true })
    .fill(continuationEmail);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    dialog.getByLabel("Verification code", { exact: true }),
  ).toBeFocused();
  const rowBox = await dialog.locator(".code-slots__row").boundingBox();
  const dialogBox = await dialog.boundingBox();
  expect(rowBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
  expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(
    dialogBox!.x + dialogBox!.width,
  );
  await dialog.getByLabel("Verification code", { exact: true }).fill("424242");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
});
