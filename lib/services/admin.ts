import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Whether the signed-in account is an admin, for gating admin pages.
 * Privilege comes from Postgres, never the session.
 */
export async function isAdminRequest() {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { isAdmin: true, banned: true },
  });
  return user?.isAdmin === true && !user.banned;
}
