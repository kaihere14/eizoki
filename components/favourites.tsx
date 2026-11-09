"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { useLoginModal } from "@/components/login-modal";
import { SkeletonFeed } from "@/components/skeleton-feed";
import { VideoCard } from "@/components/video-card";
import { VideoPreview } from "@/components/video-preview";
import { FavouriteButton } from "@/components/favourite-button";
import { fetchFavourites, type FavouriteVideo } from "@/lib/favourites";
import { formatPublishedAt } from "@/lib/videos";

export function Favourites() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { openLoginModal } = useLoginModal();

  if (!isLoaded) return <SkeletonFeed />;

  if (!isSignedIn)
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <h2 className="font-display text-[18px] font-semibold">
          Your favourites live here
        </h2>
        <p className="mt-2 text-[13px] text-zinc-500">
          Sign in to keep a private shelf of the motions worth revisiting.
        </p>
        <button
          type="button"
          onClick={openLoginModal}
          className="mt-5 rounded-full bg-brand px-5 py-2.5 text-[13px] font-medium text-on-brand outline-none hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Sign in
        </button>
      </div>
    );

  // Remount on account changes so a previous user's private shelf is never retained.
  return <FavouritesCollection key={userId} />;
}

function FavouritesCollection() {
  const [videos, setVideos] = useState<FavouriteVideo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [selected, setSelected] = useState<FavouriteVideo | null>(null);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    fetchFavourites(controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setVideos(page.videos);
        setCursor(page.nextCursor);
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load your favourites.",
          );
          setStatus("error");
        }
      });
    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [refreshToken]);

  // Saving or removing from a preview keeps the shelf in sync.
  useEffect(() => {
    const refresh = () => setRefreshToken((value) => value + 1);
    window.addEventListener("eizoki:favourites-changed", refresh);
    return () =>
      window.removeEventListener("eizoki:favourites-changed", refresh);
  }, []);

  async function loadMore() {
    if (!cursor || moreBusy) return;
    const controller = new AbortController();
    moreController.current = controller;
    setMoreBusy(true);
    setError(null);
    try {
      const page = await fetchFavourites(controller.signal, cursor);
      if (controller.signal.aborted) return;
      setVideos((current) => [
        ...current,
        ...page.videos.filter(
          (video) => !current.some((item) => item.id === video.id),
        ),
      ]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load more favourites.",
        );
    } finally {
      setMoreBusy(false);
    }
  }

  if (status === "loading") return <SkeletonFeed />;

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12.5px] text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshToken((value) => value + 1)}
            className="rounded-full border border-red-200 bg-white px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Try again
          </button>
        </div>
      )}
      {status === "ready" && videos.length === 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center">
          <Heart
            className="mx-auto mb-4 h-7 w-7 text-zinc-400"
            strokeWidth={1.5}
          />
          <h2 className="font-display text-[18px] font-semibold">
            Your shelf is empty
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Open any motion and use “Add to favourites” — it will be waiting
            here, newest save first.
          </p>
        </div>
      )}
      <div className="columns-2 gap-3 sm:gap-4 lg:columns-3 xl:columns-4">
        {videos.map((video) => (
          <article key={video.id} className="mb-5 break-inside-avoid">
            <VideoCard
              video={video}
              onOpen={() => setSelected(video)}
              paused={selected !== null}
            />
            <div className="-mt-1 flex items-start gap-2 px-1">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[12.5px] font-medium text-zinc-800">
                  {video.title}
                </h2>
                <p className="mt-1 truncate text-[11px] text-zinc-500">
                  {video.creator.name}
                </p>
                <p className="mt-0.5 text-[10.5px] text-zinc-400">
                  Saved {formatPublishedAt(video.favouritedAt)}
                </p>
              </div>
              <FavouriteButton
                compact
                videoId={video.id}
                videoTitle={video.title}
                initialFavourited
              />
            </div>
          </article>
        ))}
      </div>
      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={moreBusy}
            onClick={loadMore}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-sm outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            {moreBusy && (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            )}
            {moreBusy ? "Loading…" : "Load more favourites"}
          </button>
        </div>
      )}
      {selected && (
        <VideoPreview
          key={selected.id}
          video={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
