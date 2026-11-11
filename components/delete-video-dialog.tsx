"use client";

import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { removeMyVideo } from "@/lib/my-videos";

export function DeleteVideoDialog({
  video,
  onClose,
  onDeleted,
  description,
}: {
  video: { id: string; title: string };
  onClose: () => void;
  onDeleted: (id: string) => void;
  /** Overrides the default copy, which assumes the viewer is the uploader. */
  description?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  async function remove() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await removeMyVideo(video.id);
      posthog.capture("video_deleted", { video_id: video.id });
      onDeleted(video.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete the video. Please try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-video-title"
      aria-describedby="delete-video-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-[22px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_24px_60px_-18px_rgba(9,9,11,0.28)] backdrop:bg-zinc-900/30 backdrop:backdrop-blur-[4px]"
    >
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <h2
        id="delete-video-title"
        className="font-display text-[21px] font-semibold tracking-tight"
      >
        Delete this video?
      </h2>
      <p
        id="delete-video-description"
        className="mt-2 break-words text-[13px] leading-relaxed text-zinc-500"
      >
        {description ??
          `“${video.title}” will be removed from your uploads and the collection.`}{" "}
        This also deletes the uploaded file and cannot be undone.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-600 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-red-600 px-4 py-2 text-[12.5px] font-medium text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_4px_rgba(220,38,38,0.15)] outline-none hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {busy && (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
          )}
          {busy ? "Deleting…" : "Delete video"}
        </button>
      </div>
    </dialog>
  );
}
