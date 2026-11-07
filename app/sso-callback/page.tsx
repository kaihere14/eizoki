"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { clearAuthReturn, getAuthReturn } from "@/lib/auth-navigation";

export default function SSOCallbackPage() {
  const router = useRouter();
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <p role="status" className="text-sm text-zinc-600">
        Finishing sign in…
      </p>
      {/* Protocol callback handler, not a prebuilt sign-in form. Clerk may show a bot challenge. */}
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          const destination = session?.currentTask
            ? "/sign-in/tasks"
            : getAuthReturn();
          const url = decorateUrl(destination);
          if (!session?.currentTask) clearAuthReturn();
          if (url.startsWith("http")) window.location.assign(url);
          else {
            router.replace(url);
            router.refresh();
          }
        }}
        navigateToSignIn={() => router.replace("/sign-in")}
        navigateToSignUp={() => router.replace("/sign-in/continue")}
      />
      <button
        type="button"
        className="mt-6 rounded text-sm text-zinc-600 underline underline-offset-4"
        onClick={() => router.replace("/sign-in")}
      >
        Back to login
      </button>
    </main>
  );
}
