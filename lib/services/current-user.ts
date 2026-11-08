import { auth, currentUser } from "@clerk/nextjs/server";
import { RESTRICTION_COPY } from "@/lib/account-limits";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/** Every protected API goes through requireUser, so this blocks them all. */
export function accountSuspended() {
  return new ApiError(
    403,
    RESTRICTION_COPY.ACCOUNT_BANNED.message,
    "ACCOUNT_BANNED",
  );
}

/**
 * Resolve the signed-in Clerk account to our Postgres row. The row is created
 * on first sight so a user's first action can be a save or a submission.
 * Privilege (such as `isAdmin`) always comes from Postgres, never the session.
 */
export async function requireUser(message = "Sign in to continue.") {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, message);

  const select = {
    id: true,
    isAdmin: true,
    banned: true,
    uploadBanned: true,
  } as const;
  const existing = await prisma.user.findUnique({
    where: { clerkId: userId },
    select,
  });
  if (existing?.banned) throw accountSuspended();
  if (existing) return existing;

  const profile = await currentUser();
  if (!profile || profile.id !== userId) throw new ApiError(401, message);
  const email =
    profile.primaryEmailAddress?.emailAddress ??
    profile.emailAddresses[0]?.emailAddress;
  if (!email)
    throw new ApiError(
      422,
      "Add an email address to your account before continuing.",
    );

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
    },
    update: {},
    select,
  });
  // A concurrent request may have created the row first; check it the same way.
  if (user.banned) throw accountSuspended();
  return user;
}
