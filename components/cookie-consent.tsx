"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ANALYTICS_CONFIGURED,
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

/** Matches the exit animation in globals.css. */
const EXIT_MS = 150;

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  // Another tab made the choice.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** "unknown" on the server and during hydration, so the banner never flashes. */
function useStoredConsent() {
  return useSyncExternalStore<AnalyticsConsent | null | "unknown">(
    subscribe,
    readAnalyticsConsent,
    () => "unknown",
  );
}

const BUTTON_BASE =
  "flex-1 rounded-full px-4 py-2 text-[12.5px] font-medium outline-none transition-[background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.97]";

/**
 * Asks once before PostHog may store anything on the device. Declining is as
 * easy as accepting, and "Cookie settings" in the footer reopens it.
 */
export function CookieConsent() {
  const stored = useStoredConsent();
  const [reopened, setReopened] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const open = () => {
      setClosing(false);
      setReopened(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setReopened(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  if (!ANALYTICS_CONFIGURED || stored === "unknown") return null;
  // A saved choice hides the banner at once; keep it mounted for the exit.
  if (stored !== null && !reopened && !closing) return null;

  const choose = (consent: AnalyticsConsent) => {
    if (closing) return;
    // Keep the card on screen for its exit animation after the choice saves.
    setReopened(true);
    setClosing(true);
    saveAnalyticsConsent(consent);
  };

  return (
    <section
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-message"
      data-closing={closing ? "" : undefined}
      className="cookie-banner fixed inset-x-4 bottom-4 z-50 rounded-[20px] border border-zinc-200 bg-white p-5 text-zinc-900 shadow-[0_24px_60px_-18px_rgba(9,9,11,0.28)] sm:left-auto sm:max-w-[380px]"
    >
      <h2
        id="cookie-consent-title"
        className="font-display text-[15px] font-semibold tracking-tight"
      >
        Can we use analytics cookies?
      </h2>
      <p
        id="cookie-consent-message"
        className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-500"
      >
        Sign-in cookies are always on. Analytics cookies show us which videos
        and features people use. You can change this anytime under Cookie
        settings in the footer.{" "}
        <Link
          href="/cookies"
          className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 outline-none transition-colors hover:text-zinc-900 hover:decoration-zinc-500 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand"
        >
          Read the cookie policy
        </Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className={`${BUTTON_BASE} border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50`}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className={`${BUTTON_BASE} border border-white/20 bg-brand text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_var(--brand-shadow)] hover:bg-brand-600`}
        >
          Accept
        </button>
      </div>
    </section>
  );
}

/** Footer link that reopens the consent banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!ANALYTICS_CONFIGURED) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
