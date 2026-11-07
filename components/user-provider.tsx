"use client";

import { useAuth } from "@clerk/nextjs";
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
};

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
  const [state, setState] = useState<UserState>({
    userId: null,
    user: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const next = await fetchUser(userId, controller.signal);
      if (!controller.signal.aborted) setState(next);
    } catch (cause) {
      if (!controller.signal.aborted) setState(failure(userId, cause));
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      abortRef.current?.abort();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchUser(userId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setState(next);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setState(failure(userId, cause));
      });

    return () => controller.abort();
  }, [isLoaded, isSignedIn, userId]);

  const updateAvatar = useCallback(
    async (avatar: UserAvatar) => {
      if (!userId) throw new Error("You must be signed in to do that.");

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });

      if (response.status === 401) {
        setState({ userId, user: null, error: null });
        throw new Error("Your session expired. Please sign in again.");
      }

      if (!response.ok) throw new Error(await errorMessage(response));

      const body = (await response.json()) as { user: ApiUser };
      setState({ userId, user: body.user, error: null });
    },
    [userId],
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
    </UserContext.Provider>
  );
}
