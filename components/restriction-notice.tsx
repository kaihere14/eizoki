"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Hourglass, UploadCloud } from "lucide-react";
import { RESTRICTION_COPY, type RestrictionCode } from "@/lib/account-limits";

/** Matches the exit animation in globals.css. */
const EXIT_MS = 150;

const ICONS = {
  REVIEW_PENDING: Hourglass,
  UPLOAD_BANNED: UploadCloud,
  ACCOUNT_BANNED: Ban,
} as const;

/**
 * Small modal that explains why the user cannot do something right now:
 * a video still in review, uploads turned off, or a suspended account.
 */
export function RestrictionNotice({
  code,
  onClose,
}: {
  code: RestrictionCode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onCloseRef.current(), EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  const dismiss = () => setClosing(true);
  const copy = RESTRICTION_COPY[code];
  const Icon = ICONS[code];
  const danger = code !== "REVIEW_PENDING";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="restriction-title"
      aria-describedby="restriction-message"
      data-closing={closing ? "" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) dismiss();
      }}
      className="notice-dialog m-auto w-[calc(100%_-_2rem)] max-w-[360px] rounded-[22px] border border-zinc-200 bg-white p-6 text-center text-zinc-900 shadow-[0_24px_60px_-18px_rgba(9,9,11,0.28)] backdrop:bg-zinc-900/25 backdrop:backdrop-blur-[4px]"
    >
      <span
        className={`notice-icon mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand"}`}
      >
        <Icon
          className={code === "REVIEW_PENDING" ? "notice-hourglass h-5 w-5" : "h-5 w-5"}
          strokeWidth={1.7}
        />
      </span>
      <h2
        id="restriction-title"
        className="font-display text-[19px] font-semibold tracking-tight"
      >
        {copy.title}
      </h2>
      <p
        id="restriction-message"
        className="mt-2 text-[13px] leading-relaxed text-zinc-500"
      >
        {copy.message}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {code === "REVIEW_PENDING" && (
          <Link
            href="/my-videos"
            onClick={dismiss}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-600 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand"
          >
            View my videos
          </Link>
        )}
        <button
          type="button"
          autoFocus
          onClick={dismiss}
          className="rounded-full border border-white/20 bg-brand px-5 py-2 text-[12.5px] font-medium text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_var(--brand-shadow)] outline-none transition-[background-color,transform] duration-150 hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}
