/**
 * Error codes the API attaches to account and upload restrictions, so the
 * client can show the right notice instead of a generic error. Safe to import
 * from client and server code.
 */
export const RESTRICTION_CODES = [
  "ACCOUNT_BANNED",
  "UPLOAD_BANNED",
  "REVIEW_PENDING",
] as const;

export type RestrictionCode = (typeof RESTRICTION_CODES)[number];

export function isRestrictionCode(value: unknown): value is RestrictionCode {
  return RESTRICTION_CODES.includes(value as RestrictionCode);
}

export const RESTRICTION_COPY: Record<
  RestrictionCode,
  { title: string; message: string }
> = {
  ACCOUNT_BANNED: {
    title: "Account suspended",
    message:
      "This account has been suspended, so you have been signed out. Contact us if you think this is a mistake.",
  },
  UPLOAD_BANNED: {
    title: "Uploads are turned off",
    message:
      "Uploading has been turned off for this account. You can still browse and save favourites.",
  },
  REVIEW_PENDING: {
    title: "One video at a time",
    message:
      "Please wait for your previous video to be reviewed before uploading the next one.",
  },
};
