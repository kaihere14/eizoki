import { currentUser } from "@clerk/nextjs/server";
import type { Avatar } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

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

  return { clerkId: clerkUser.id, profile };
}

/** Creates the row on first sight, then keeps it in sync with Clerk. */
async function upsertUser(
  clerkId: string,
  profile: ClerkProfile,
  avatar?: Avatar,
) {
  const changes = avatar ? { ...profile, avatar } : profile;

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, ...changes },
      update: changes,
    });

    return Response.json({ user });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
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

  return upsertUser(result.clerkId, result.profile);
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

  return upsertUser(result.clerkId, result.profile, avatar as Avatar);
}
