import posthog from "posthog-js";

/**
 * Analytics consent. PostHog starts opted out with storage disabled, so it
 * stores nothing on the device until the visitor accepts. Sign-in (Clerk) and
 * theme storage are strictly necessary and are not covered by this choice.
 *
 * The choice lives under our own key because `posthog.reset()` (called on
 * sign-out) clears PostHog's stored consent; `applyAnalyticsConsent()`
 * re-applies it afterwards.
 */
export type AnalyticsConsent = "granted" | "denied";

const STORAGE_KEY = "eizoki:analytics-consent";

/** Fallback for this page view when localStorage is blocked. */
let memoryConsent: AnalyticsConsent | null = null;

/** Fired on window after the visitor accepts or declines. */
export const CONSENT_CHANGE_EVENT = "eizoki:analytics-consent-changed";
/** Fired on window to reopen the banner from "Cookie settings". */
export const CONSENT_OPEN_EVENT = "eizoki:open-cookie-settings";

export const ANALYTICS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

/** Syncs PostHog with the stored choice. No choice yet means it stays opted out. */
export function applyAnalyticsConsent(
  consent: AnalyticsConsent | null = readAnalyticsConsent(),
) {
  if (!posthog.__loaded) return;

  if (consent === "granted") {
    posthog.opt_in_capturing({ captureEventName: false });
  } else if (consent === "denied") {
    // Also disables PostHog storage and removes what it had saved.
    posthog.opt_out_capturing();
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  memoryConsent = consent;
  try {
    window.localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // Storage can be blocked; the choice still applies for this page view.
  }
  applyAnalyticsConsent(consent);
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsent>(CONSENT_CHANGE_EVENT, { detail: consent }),
  );
}
