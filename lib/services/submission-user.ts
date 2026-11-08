import { requireUser } from "./current-user";

/** Authorize before reading the upload; privilege always comes from Postgres. */
export function requireSubmissionUser(message = "Sign in to submit a video.") {
  return requireUser(message);
}
