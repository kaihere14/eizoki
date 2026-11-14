"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import posthog from "posthog-js";
import {
  applyAnalyticsConsent,
  CONSENT_CHANGE_EVENT,
} from "@/lib/analytics-consent";
import { RestrictionNotice } from "@/components/restriction-notice";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ApiUser, UserAvatar } from "@/lib/user";

type UserContextValue = {
  /** The Postgres row for the signed-in user, or null when signed out. */
  user: ApiUser | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateAvatar: (avatar: UserAvatar) => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function useEizokiUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useEizokiUser must be used within a UserProvider");
  }

  return context;
}

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);

  if (body && typeof body.error === "string") return body.error;

  return `Request failed (${response.status}).`;
}

type UserState = {
  /** Which Clerk user this record belongs to; guards against stale data. */
  userId: string | null;
  user: ApiUser | null;
  error: string | null;
  /** The account is banned; the provider signs it out. */
  suspended?: boolean;
};

function identifyInPostHog(user: ApiUser) {
  posthog.identify(user.id, {
    email: user.email,
    first_name: user.firstName ?? undefined,
    last_name: user.lastName ?? undefined,
    username: user.username ?? undefined,
    is_admin: user.isAdmin,
  });
}

function failure(userId: string, cause: unknown): UserState {
  return {
    userId,
    user: null,
    error:
      cause instanceof Error ? cause.message : "Could not load your account.",
  };
}

/** `GET /api/users/me` — creates the row on first sight, then returns it. */
async function fetchUser(userId: string, signal: AbortSignal): Promise<UserState> {
  const response = await fetch("/api/users/me", {
    cache: "no-store",
    signal,
  });

  // Clerk's session is missing or no longer valid.
  if (response.status === 401) return { userId, user: null, error: null };

  if (response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    if (body?.code === "ACCOUNT_BANNED")
      return { userId, user: null, error: null, suspended: true };
  }

  if (!response.ok) throw new Error(await errorMessage(response));

  const body = (await response.json()) as { user: ApiUser };

  return { userId, user: body.user, error: null };
}

/**
 * Loads the signed-in user from `/api/users/me` once per session. The API
 * upserts on first sight, so this is also what creates the database row.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const [showSuspended, setShowSuspended] = useState(false);
  const [state, setState] = useState<UserState>({
    userId: null,
    user: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const identifiedUserIdRef = useRef<string | null>(null);

  const resetIdentity = useCallback(() => {
    if (!identifiedUserIdRef.current) return;
    posthog.reset();
    // reset() also clears PostHog's consent; restore the visitor's choice.
    applyAnalyticsConsent();
    identifiedUserIdRef.current = null;
  }, []);

  // A suspended account cannot use the app: sign it out and say why. The user
  // record loads right after every sign-in, so a banned user cannot get past it.
  const apply = useCallback(
    (next: UserState) => {
      if (next.user) {
        if (
          identifiedUserIdRef.current &&
          identifiedUserIdRef.current !== next.user.id
        ) {
          resetIdentity();
        }
        if (identifiedUserIdRef.current !== next.user.id) {
          identifyInPostHog(next.user);
          identifiedUserIdRef.current = next.user.id;
        }
      } else {
        resetIdentity();
      }

      setState(next);
      if (next.suspended) {
        setShowSuspended(true);
        void signOut();
      }
    },
    [resetIdentity, signOut],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const next = await fetchUser(userId, controller.signal);
      if (!controller.signal.aborted) apply(next);
    } catch (cause) {
      if (!controller.signal.aborted) apply(failure(userId, cause));
    }
  }, [userId, apply]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      abortRef.current?.abort();
      resetIdentity();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchUser(userId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) apply(next);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) apply(failure(userId, cause));
      });

    return () => controller.abort();
  }, [isLoaded, isSignedIn, userId, apply, resetIdentity]);

  // Upload limits change when the user submits or deletes a video, and when an
  // admin reviews one, so re-read them on those events and on returning to the tab.
  useEffect(() => {
    if (!isSignedIn) return;
    const reload = () => void refresh();
    window.addEventListener("eizoki:videos-changed", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("eizoki:videos-changed", reload);
      window.removeEventListener("focus", reload);
    };
  }, [isSignedIn, refresh]);

  // identify() does nothing before consent, so link the account once the
  // visitor accepts analytics while already signed in.
  const signedInUser = state.userId === userId ? state.user : null;
  useEffect(() => {
    if (!signedInUser) return;
    const onConsent = (event: Event) => {
      if ((event as CustomEvent<string>).detail === "granted") {
        identifyInPostHog(signedInUser);
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsent);
  }, [signedInUser]);

  const updateAvatar = useCallback(
    async (avatar: UserAvatar) => {
      if (!userId) throw new Error("You must be signed in to do that.");

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });

      if (response.status === 401) {
        apply({ userId, user: null, error: null });
        throw new Error("Your session expired. Please sign in again.");
      }

      if (!response.ok) throw new Error(await errorMessage(response));

      const body = (await response.json()) as { user: ApiUser };
      setState({ userId, user: body.user, error: null });
    },
    [userId, apply],
  );

  const signedIn = isSignedIn === true;
  const current = state.userId === userId ? state : null;

  return (
    <UserContext.Provider
      value={{
        user: signedIn ? (current?.user ?? null) : null,
        // No row for this Clerk user yet means the first request is in flight.
        isLoading: signedIn && !current,
        error: signedIn ? (current?.error ?? null) : null,
        refresh,
        updateAvatar,
      }}
    >
      {children}
      {showSuspended && (
        <RestrictionNotice
          code="ACCOUNT_BANNED"
          onClose={() => setShowSuspended(false)}
        />
      )}
    </UserContext.Provider>
  );
}
