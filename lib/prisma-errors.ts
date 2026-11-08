/** True for a Prisma unique-constraint failure, optionally on one field. */
export function isUniqueViolation(error: unknown, field?: string) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  if (!field) return true;
  return JSON.stringify("meta" in error ? error.meta : null).includes(field);
}
