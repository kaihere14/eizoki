import { auth, currentUser } from "@clerk/nextjs/server";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the signed-in Clerk account to our Postgres row. The row is created
 * on first sight so a user's first action can be a save or a submission.
 * Privilege (such as `isAdmin`) always comes from Postgres, never the session.
 */
export async function requireUser(message = "Sign in to continue.") {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, message);

  const select = { id: true, isAdmin: true } as const;
  const existing = await prisma.user.findUnique({
    where: { clerkId: userId },
    select,
  });
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

  return prisma.user.upsert({
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
}
