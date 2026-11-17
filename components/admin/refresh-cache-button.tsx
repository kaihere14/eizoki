"use client";

import { useActionState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import {
  refreshSiteCacheAction,
  type RefreshCacheState,
} from "@/app/admin/actions";

const INITIAL: RefreshCacheState = { error: null, refreshedAt: null };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Rebuilds the public pages from Postgres on their next visit. For changes
 * made outside the app, such as featuring a video in Prisma Studio.
 */
export function RefreshCacheButton() {
  const [state, dispatch, pending] = useActionState(
    refreshSiteCacheAction,
    INITIAL,
  );

  return (
    <form action={dispatch} className="flex flex-col items-center gap-1.5">
      <button
        type="submit"
        disabled={pending}
        title="Rebuild the home, category, video and tag pages, the sitemap and sponsors from the database"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-zinc-700 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle
            className="h-3 w-3 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
        )}
        Refresh site cache
      </button>
      <p role="status" className="text-[11px] text-zinc-500">
        {state.error ? (
          <span className="text-red-600">{state.error}</span>
        ) : state.refreshedAt ? (
          `Refreshed at ${formatTime(state.refreshedAt)}. Scroll pages and search catch up within 5 minutes.`
        ) : null}
      </p>
    </form>
  );
}
