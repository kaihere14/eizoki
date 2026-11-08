import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/nextjs/server";
import { Client } from "pg";

const email = `eizoki-upload-${Date.now()}+clerk_test@example.com`;
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

test("a signed-in user cannot finish someone else's upload through the real stack", async ({
  page,
}) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();

  // Ownership is checked before R2 is contacted, so no storage is needed.
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metadata: {
          title: "Ownership check",
          category: "ai-motion-design",
          creatorName: "Test creator",
        },
        upload: {
          key: "videos/someone-else/0b7c5c1e-9a55-4a8e-8f0e-1d2c3b4a5f60.mp4",
          uploadId: "upload-id",
          parts: [{ partNumber: 1, etag: '"etag"' }],
        },
      }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(result).toEqual({
    status: 403,
    body: { error: "That upload is not yours." },
  });
});
