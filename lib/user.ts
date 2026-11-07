/** Shape returned by `GET /api/users/me` (dates are JSON strings). */
export type ApiUser = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatar: UserAvatar;
  createdAt: string;
  updatedAt: string;
};

/** Matches the Prisma `Avatar` enum. Only the choice is stored, never an image URL. */
export type UserAvatar = "GIRL" | "BOY";

export const USER_AVATARS: readonly UserAvatar[] = ["GIRL", "BOY"];

export const AVATAR_IMAGES: Record<UserAvatar, string> = {
  GIRL: "/avatars/female-transparent.png",
  BOY: "/avatars/male-transparent.png",
};

export function isUserAvatar(value: unknown): value is UserAvatar {
  return value === "GIRL" || value === "BOY";
}
