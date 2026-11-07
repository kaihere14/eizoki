"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthReturn, getAuthReturn } from "@/lib/auth-navigation";
import { authErrorMessage } from "./use-auth-flow";

export function AuthCompletion() {
  const clerk = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const session = clerk.session;

  useEffect(() => {
    if (!clerk.loaded || session?.currentTask) return;
    if (!session || session.status !== "active") {
      router.replace("/sign-in");
      return;
    }
    const destination = getAuthReturn();
    clearAuthReturn();
    router.replace(destination);
    router.refresh();
  }, [clerk.loaded, session, router]);

  // Eizoki is configured without organization, password, or MFA-enrollment tasks.
  // If that configuration changes, fail closed rather than bypassing a pending task.
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="font-display text-2xl font-semibold text-zinc-900">
        {session?.currentTask ? "Account action required" : "Finishing sign in"}
      </h1>
      <p role="status" className="mt-3 text-sm leading-6 text-zinc-600">
        {session?.currentTask
          ? "Your account requires an additional setup step. Please contact support before continuing."
          : "Please wait while we finish signing you in."}
      </p>
      {session?.currentTask && (
        <button
          type="button"
          className="mt-6 rounded-full bg-zinc-100 px-4 py-2 text-sm"
          onClick={async () => {
            try {
              await clerk.signOut({ redirectUrl: "/sign-in" });
            } catch (error) {
              setError(authErrorMessage(error));
            }
          }}
        >
          Sign out and start again
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
