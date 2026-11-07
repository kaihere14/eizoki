import { clerkSetup } from "@clerk/testing/playwright";

export default async function globalSetup() {
  if (
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")
  ) {
    throw new Error("Authentication tests require Clerk development keys.");
  }
  await clerkSetup();
}
