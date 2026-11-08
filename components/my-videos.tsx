"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Film, FileX2, LoaderCircle, Trash2 } from "lucide-react";
import { useLoginModal } from "@/components/login-modal";
import { SkeletonFeed } from "@/components/skeleton-feed";
import { VideoCard } from "@/components/video-card";
import { VideoPreview } from "@/components/video-preview";
import { DeleteVideoDialog } from "@/components/delete-video-dialog";
import { fetchMyVideos, hasVideoFile, type MyVideo } from "@/lib/my-videos";
import { formatPublishedAt } from "@/lib/videos";

export function MyVideos() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { openLoginModal } = useLoginModal();
  if (!isLoaded) return <SkeletonFeed />;
  if (!isSignedIn)
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <h2 className="font-display text-[18px] font-semibold">
          Your videos live here
        </h2>
        <p className="mt-2 text-[13px] text-zinc-500">
          Sign in to see and manage the videos you’ve uploaded.
        </p>
        <button
          type="button"
          onClick={openLoginModal}
          className="mt-5 rounded-full bg-brand px-5 py-2.5 text-[13px] font-medium text-white outline-none hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Sign in
        </button>
      </div>
    );
  // Remount on account changes so a previous user's private list is never retained.
  return <MyVideosCollection key={userId} />;
}

function MyVideosCollection() {
  const [viewTime] = useState(() => Date.now());
  const [videos, setVideos] = useState<MyVideo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [selected, setSelected] = useState<
    (MyVideo & { videoUrl: string }) | null
  >(null);
  const [deleting, setDeleting] = useState<MyVideo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    fetchMyVideos(controller.signal)
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
              : "Unable to load your videos.",
          );
          setStatus("error");
        }
      });
    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [refreshToken]);

  useEffect(() => {
    const refresh = () => setRefreshToken((value) => value + 1);
    window.addEventListener("eizoki:videos-changed", refresh);
    return () => window.removeEventListener("eizoki:videos-changed", refresh);
  }, []);

  async function loadMore() {
    if (!cursor || moreBusy) return;
    const controller = new AbortController();
    moreController.current = controller;
    setMoreBusy(true);
    setError(null);
    try {
      const page = await fetchMyVideos(controller.signal, cursor);
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
            : "Unable to load more videos.",
        );
    } finally {
      setMoreBusy(false);
    }
  }

  function deleted(id: string) {
    setVideos((current) => current.filter((video) => video.id !== id));
    setDeleting(null);
    setNotice("Video deleted.");
    window.dispatchEvent(new Event("eizoki:videos-changed"));
  }

  if (status === "loading") return <SkeletonFeed />;

  return (
    <>
      {notice && (
        <p role="status" className="mb-4 text-[13px] text-zinc-600">
          {notice}
        </p>
      )}
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
          <Film
            className="mx-auto mb-4 h-7 w-7 text-zinc-400"
            strokeWidth={1.5}
          />
          <h2 className="font-display text-[18px] font-semibold">
            Your first video starts here
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Use Submit in the navbar to upload a video. Published, pending, and
            rejected submissions will all appear here.
          </p>
        </div>
      )}
      <div className="columns-2 gap-3 sm:gap-4 lg:columns-3 xl:columns-4">
        {videos.map((video) => (
          <article key={video.id} className="mb-5 break-inside-avoid">
            {hasVideoFile(video) ? (
              <VideoCard
                video={video}
                onOpen={() => setSelected(video)}
                paused={selected !== null || deleting !== null}
              />
            ) : (
              // Rejected: the file was deleted, so only the outcome remains.
              <div className="mb-3 flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center sm:mb-4">
                <FileX2
                  className="h-5 w-5 text-zinc-400"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="px-3 text-[11.5px] leading-snug text-zinc-500">
                  Not approved · video removed
                </span>
              </div>
            )}
            <div className="-mt-1 flex items-start gap-2 px-1">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[12.5px] font-medium text-zinc-800">
                  {video.title}
                </h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {video.reviewStatus === "PENDING_REVIEW"
                    ? "Pending review"
                    : video.reviewStatus === "REJECTED"
                      ? "Rejected"
                      : video.publishedAt &&
                          Date.parse(video.publishedAt) <= viewTime
                        ? "Published"
                        : "Approved"}
                </p>
                <p className="mt-0.5 text-[10.5px] text-zinc-400">
                  Uploaded {formatPublishedAt(video.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${video.title}`}
                onClick={() => setDeleting(video)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-400 outline-none transition-colors duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
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
            {moreBusy ? "Loading…" : "Load more videos"}
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
      {deleting && (
        <DeleteVideoDialog
          video={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={deleted}
        />
      )}
    </>
  );
}
