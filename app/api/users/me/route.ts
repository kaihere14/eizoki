import { currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
import type { Avatar } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { RESTRICTION_COPY } from "@/lib/account-limits";
import { upsertAdoptingPreviousRow } from "@/lib/services/current-user";
import { hasVideoAwaitingReview } from "@/lib/services/upload-limits";
import { isUniqueViolation } from "@/lib/prisma-errors";

const AVATARS: Avatar[] = ["GIRL", "BOY"];

type ClerkProfile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

/** Reads the Clerk session and the profile fields we mirror in Postgres. */
async function loadClerkProfile() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return Response.json(
      { error: "The Clerk user has no email address." },
      { status: 422 },
    );
  }

  const profile: ClerkProfile = {
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
  };

  return { clerkUser, profile };
}

/** Creates the row on first sight, then keeps it in sync with Clerk. */
async function upsertUser(
  clerkUser: ClerkUser,
  profile: ClerkProfile,
  avatar?: Avatar,
) {
  const changes = avatar ? { ...profile, avatar } : profile;

  try {
    const clerkId = clerkUser.id;
    const user = await upsertAdoptingPreviousRow(clerkUser, () =>
      prisma.user.upsert({
        where: { clerkId },
        create: { clerkId, ...changes },
        update: changes,
      }),
    );

    // The client signs a suspended account out as soon as it sees this.
    if (user.banned) {
      return Response.json(
        { error: RESTRICTION_COPY.ACCOUNT_BANNED.message, code: "ACCOUNT_BANNED" },
        { status: 403 },
      );
    }

    // Lets the Submit button explain a limit before the upload even starts.
    const hasPendingVideo =
      !user.isAdmin && (await hasVideoAwaitingReview(user.id));
    return Response.json({ user: { ...user, hasPendingVideo } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { error: "This email address is already linked to another account." },
        { status: 409 },
      );
    }

    throw error;
  }
}

/**
 * Returns the signed-in user's database record, creating it from their Clerk
 * profile on first request. This is the source of truth for our own `User.id`.
 */
export async function GET() {
  const result = await loadClerkProfile();

  if (result instanceof Response) return result;

  return upsertUser(result.clerkUser, result.profile);
}

/** Updates the fields a user may change themselves — currently the avatar. */
export async function PATCH(request: Request) {
  const result = await loadClerkProfile();

  if (result instanceof Response) return result;

  const body: unknown = await request.json().catch(() => null);
  const avatar =
    typeof body === "object" && body !== null && "avatar" in body
      ? body.avatar
      : undefined;

  if (!AVATARS.includes(avatar as Avatar)) {
    return Response.json(
      { error: `avatar must be one of: ${AVATARS.join(", ")}` },
      { status: 400 },
    );
  }

  return upsertUser(result.clerkUser, result.profile, avatar as Avatar);
}
