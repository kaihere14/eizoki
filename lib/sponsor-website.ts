/** Use only the origin for icon requests, never a pasted path, query or credentials. */
export function sponsorWebsiteOrigin(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    if (
      url.protocol !== "https:" ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
