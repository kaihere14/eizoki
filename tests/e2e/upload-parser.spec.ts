import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/nextjs/server";
import { Client } from "pg";

const email = `eizoki-parser-${Date.now()}+clerk_test@example.com`;
const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
let clerkId: string;

test.beforeAll(async () => {
  const user = await client.users.createUser({
    emailAddress: [email],
    skipPasswordRequirement: true,
  });
  clerkId = user.id;
});

test.afterAll(async () => {
  if (!clerkId) return;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();
    await db.query('DELETE FROM users WHERE "clerkId"=$1', [clerkId]);
  } finally {
    await db.end();
    await client.users.deleteUser(clerkId);
  }
});

test("multipart uploads above 10 MB reach file validation intact through the real proxy", async ({
  page,
}) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();

  for (const size of [1_000_000, 11_000_000]) {
    const result = await page.evaluate(async (bytes) => {
      const body = new FormData();
      // Intentionally invalid video bytes: parsing must succeed, then format
      // validation rejects the file before any ImageKit request or video write.
      body.set(
        "file",
        new File([new Uint8Array(bytes)], "parser-test.mp4", {
          type: "video/mp4",
        }),
      );
      body.set(
        "metadata",
        JSON.stringify({
          title: "Parser regression",
          category: "ai-motion-design",
          creatorName: "Test creator",
        }),
      );
      const response = await fetch("/api/videos", { method: "POST", body });
      return { status: response.status, body: await response.json() };
    }, size);
    expect(result, `${size} byte upload`).toEqual({
      status: 415,
      body: { error: "The file contents do not match the video format." },
    });
  }
});
