"use client";

import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { Film, LoaderCircle, RefreshCw } from "lucide-react";
import { DeleteVideoDialog } from "@/components/delete-video-dialog";
import { SkeletonFeed } from "@/components/skeleton-feed";
import { useEizokiUser } from "@/components/user-provider";
import { SponsoredVideoCard } from "@/components/sponsored-video-card";
import { VideoCard } from "@/components/video-card";
import { VideoPreview } from "@/components/video-preview";
import { fetchVideoFeed, type VideoFeedPage } from "@/lib/video-feed";
import {
  FEED_SPONSOR_POSITION,
  type PublicFeedSponsor,
} from "@/lib/sponsorships";
import type { VideoCategory, VideoMetadata } from "@/lib/videos";

type FeedStatus = "loading" | "ready" | "error";

/**
 * How far below the viewport the end of the feed may be when the next page is
 * requested. Roughly two rows of cards, so new videos arrive before the reader
 * reaches the bottom.
 */
const PREFETCH_MARGIN = "0px 0px 1200px 0px";

function mergeVideos(current: VideoMetadata[], incoming: VideoMetadata[]) {
  const seen = new Set(current.map((video) => video.id));
  return [...current, ...incoming.filter((video) => !seen.has(video.id))];
}

export function VideoFeed({
  initialPage,
  category,
}: {
  initialPage?: VideoFeedPage;
  /** Shows only this category. Remount (via `key`) to switch categories. */
  category?: VideoCategory;
} = {}) {
  const [videos, setVideos] = useState<VideoMetadata[]>(initialPage?.videos ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPage?.nextCursor ?? null,
  );
  const [status, setStatus] = useState<FeedStatus>(
    initialPage ? "ready" : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VideoMetadata | null>(null);
  const [sponsor, setSponsor] = useState<PublicFeedSponsor | null>(
    initialPage?.sponsor ?? null,
  );
  const [deleting, setDeleting] = useState<VideoMetadata | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Guards against a second request before `isLoadingMore` re-renders.
  const loadingMoreRef = useRef(false);
  // Only reveals the control; the API re-checks admin in Postgres.
  const isAdmin = useEizokiUser().user?.isAdmin === true;

  useEffect(() => {
    if (initialPage && refreshToken === 0) return;
    const controller = new AbortController();

    fetchVideoFeed({ category, signal: controller.signal })
      .then((page) => {
        setVideos(page.videos);
        setNextCursor(page.nextCursor);
        setSponsor(page.sponsor);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "The videos could not be loaded. Please try again.",
        );
        setStatus("error");
      });

    return () => controller.abort();
  }, [refreshToken, initialPage, category]);

  // A successful submission asks the feed to pick up the new record.
  useEffect(() => {
    const refresh = () => setRefreshToken((token) => token + 1);
    window.addEventListener("eizoki:videos-changed", refresh);
    return () => window.removeEventListener("eizoki:videos-changed", refresh);
  }, []);

  function retry() {
    setStatus("loading");
    setError(null);
    setRefreshToken((token) => token + 1);
  }

  async function loadMore() {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchVideoFeed({ cursor: nextCursor, category });
      setVideos((current) => mergeVideos(current, page.videos));
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setLoadMoreError(
        cause instanceof Error
          ? cause.message
          : "More videos could not be loaded.",
      );
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }

  const loadMoreNearEnd = useEffectEvent(() => {
    void loadMore();
  });

  // Requests the next page as the end of the feed nears the viewport. The
  // observer is rebuilt for each cursor, and a new observer reports straight
  // away, so a page too short to fill the screen keeps loading. A failed page
  // stops this until the reader retries.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || loadMoreError) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMoreNearEnd();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadMoreError, videos.length]);

  if (status === "loading" && videos.length === 0) {
    return <SkeletonFeed spacious />;
  }

  if (status === "error" && videos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-zinc-200/70 bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <RefreshCw className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <p className="mt-4 text-[14px] font-medium text-zinc-800">
          The collection could not be loaded
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-500">
          {error}
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand"
        >
          Try again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <Film className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <p className="mt-4 text-[14px] font-medium text-zinc-800">
          {category
            ? "Nothing in this category yet"
            : "The collection is waiting for its first piece"}
        </p>
        <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-zinc-500">
          Published submissions appear here as soon as they pass review.
        </p>
      </div>
    );
  }

  // Pinned at a fixed position; a short catalogue shows it last instead.
  const sponsorIndex = Math.min(FEED_SPONSOR_POSITION, videos.length);

  return (
    <>
      {status === "error" && error && (
        <div
          role="status"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-[12px] text-amber-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-amber-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Retry
          </button>
        </div>
      )}

      <div className="columns-1 gap-5 sm:columns-2 sm:gap-6 xl:columns-3">
        {videos.map((video, index) => (
          <Fragment key={video.id}>
            {sponsor && index === sponsorIndex && (
              <SponsoredVideoCard
                sponsor={sponsor}
                paused={selected !== null}
                className="mb-5 sm:mb-6"
              />
            )}
            <VideoCard
              video={video}
              onOpen={setSelected}
              paused={selected !== null || deleting !== null}
              className="mb-5 sm:mb-6"
              onDelete={isAdmin ? setDeleting : undefined}
            />
          </Fragment>
        ))}
        {sponsor && sponsorIndex === videos.length && (
          <SponsoredVideoCard
            sponsor={sponsor}
            paused={selected !== null}
            className="mb-5 sm:mb-6"
          />
        )}
      </div>

      {nextCursor && (
        <div
          ref={sentinelRef}
          className="mt-6 flex min-h-10 flex-col items-center gap-3"
        >
          {loadMoreError ? (
            <>
              <p role="alert" className="text-[12px] text-red-600">
                {loadMoreError}
              </p>
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait disabled:opacity-60"
              >
                Try again
              </button>
            </>
          ) : (
            isLoadingMore && (
              <p
                role="status"
                className="inline-flex items-center gap-2 text-[12.5px] text-zinc-500"
              >
                <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                Loading more videos…
              </p>
            )
          )}
        </div>
      )}

      {deleting && (
        <DeleteVideoDialog
          video={deleting}
          description={`“${deleting.title}” by ${deleting.creator.name} will be taken down from the collection.`}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setVideos((current) => current.filter((video) => video.id !== id));
            setSelected((current) => (current?.id === id ? null : current));
            setDeleting(null);
          }}
        />
      )}

      {selected && (
        <VideoPreview
          key={selected.id}
          video={selected}
          similar={videos}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
