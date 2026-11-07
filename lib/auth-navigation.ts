const RETURN_KEY = "eizoki:auth-return";

/** Only return to paths on this app, never an authentication route or external URL. */
export function safeReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  const path = value.split(/[?#]/)[0];
  if (/^\/(sign-in|sso-callback)(\/|$)/.test(path)) return "/";
  return value;
}

export function rememberAuthReturn() {
  const path = safeReturnPath(
    window.location.pathname + window.location.search + window.location.hash,
  );
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* Storage may be unavailable. */
  }
  return path;
}

export function getAuthReturn() {
  try {
    return safeReturnPath(sessionStorage.getItem(RETURN_KEY));
  } catch {
    return "/";
  }
}

export function clearAuthReturn() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* Storage may be unavailable. */
  }
}
