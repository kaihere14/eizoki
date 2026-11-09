import { auth, currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
import { RESTRICTION_COPY } from "@/lib/account-limits";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/prisma-errors";

/**
 * Moving to a new Clerk instance gives every account a new `user_…` id, so the
 * first upsert under the new id collides with the old row on `email`. Point
 * that row at the new id so the account keeps its favourites, videos and
 * roles. Only verified addresses count, so nobody can claim a row by typing
 * someone else's email.
 */
async function adoptRowWithVerifiedEmail(clerkUser: ClerkUser) {
  const emails = clerkUser.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress);
  if (emails.length === 0) return false;

  const previous = await prisma.user.findFirst({
    where: { email: { in: emails }, NOT: { clerkId: clerkUser.id } },
    select: { id: true },
  });
  if (!previous) return false;

  try {
    await prisma.user.update({
      where: { id: previous.id },
      data: { clerkId: clerkUser.id },
    });
  } catch (error) {
    // A concurrent request already created a row for the new id; keep that one.
    if (!isUniqueViolation(error, "clerkId")) throw error;
    return false;
  }
  return true;
}

/**
 * Runs an upsert keyed on the Clerk id. If it collides with an older row on
 * `email`, adopts that row and tries once more. A second collision is rethrown.
 */
export async function upsertAdoptingPreviousRow<T>(
  clerkUser: ClerkUser,
  upsert: () => Promise<T>,
) {
  try {
    return await upsert();
  } catch (error) {
    if (!isUniqueViolation(error, "email")) throw error;
    if (!(await adoptRowWithVerifiedEmail(clerkUser))) throw error;
    return upsert();
  }
}

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

  const user = await upsertAdoptingPreviousRow(profile, () =>
    prisma.user.upsert({
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
    }),
  );
  // A concurrent request may have created the row first; check it the same way.
  if (user.banned) throw accountSuspended();
  return user;
}
