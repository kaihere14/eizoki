"use client";

import { useActionState, type ReactNode } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import {
  approveVideoAction,
  rejectVideoAction,
  type VideoReviewState,
} from "@/app/admin/videos/actions";
import { CATEGORY_LABELS, formatDuration, type VideoCategory } from "@/lib/videos";
import { VIDEO_TAGS } from "@/lib/video-tags";

export interface VideoReviewRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  creatorName: string;
  creatorUsername: string | null;
  creatorXUrl: string | null;
  creatorProfileUrl: string | null;
  sourceUrl: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  promptStatus: "ORIGINAL" | "RECONSTRUCTED" | "UNAVAILABLE";
  promptText: string | null;
  negativePrompt: string | null;
  toolsUsed: string[];
  createdAt: string;
  submitterEmail: string;
}

const INITIAL: VideoReviewState = { error: null };

const PROMPT_LABELS: Record<VideoReviewRow["promptStatus"], string> = {
  ORIGINAL: "Original prompt",
  RECONSTRUCTED: "Reconstructed prompt",
  UNAVAILABLE: "No prompt",
};

const TAG_LABELS = new Map<string, string>(
  VIDEO_TAGS.map((tag) => [tag.value, tag.label]),
);

// UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait disabled:opacity-60";
const fieldClass =
  "rounded-[10px] border border-zinc-200 bg-white px-2.5 py-1.5 text-[12.5px] text-zinc-900 outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10";

function Pending() {
  return (
    <LoaderCircle
      className="h-3 w-3 animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

function ErrorText({ state }: { state: VideoReviewState }) {
  return state.error ? (
    <p role="alert" className="mt-2 text-[12px] text-red-600">
      {state.error}
    </p>
  ) : null;
}

function ExternalUrl({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 break-all text-zinc-700 hover:text-zinc-950"
    >
      {href}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

function ApproveForm({ row }: { row: VideoReviewRow }) {
  const [state, dispatch, pending] = useActionState(approveVideoAction, INITIAL);
  return (
    <form action={dispatch}>
      <input type="hidden" name="id" value={row.id} />
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass} bg-brand text-on-brand hover:bg-brand-600`}
      >
        {pending && <Pending />}
        Approve and publish
      </button>
      <ErrorText state={state} />
    </form>
  );
}

function RejectForm({ row }: { row: VideoReviewRow }) {
  const [state, dispatch, pending] = useActionState(rejectVideoAction, INITIAL);
  return (
    <form action={dispatch} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={row.id} />
      <label className="min-w-0 flex-1 text-[11px] text-zinc-500">
        Note (private)
        <input
          name="notes"
          maxLength={2000}
          placeholder="Why it was declined"
          className={`${fieldClass} mt-1 block w-full`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50`}
      >
        {pending && <Pending />}
        Reject
      </button>
      <div className="basis-full">
        <ErrorText state={state} />
      </div>
    </form>
  );
}

function Detail({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="break-words text-zinc-700">{children}</dd>
    </div>
  );
}

function VideoItem({ row, position }: { row: VideoReviewRow; position: number }) {
  const handle = row.creatorUsername?.trim();
  const profile = row.creatorProfileUrl ?? row.creatorXUrl;
  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-5">
        <video
          src={row.videoUrl}
          controls
          muted
          playsInline
          preload="metadata"
          className="max-h-[420px] w-full rounded-xl bg-zinc-100 object-contain"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] tabular-nums text-zinc-400">
              #{position}
            </span>
            <h3 className="text-[14px] font-medium text-zinc-900">
              {row.title}
            </h3>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-zinc-600">
              {CATEGORY_LABELS[row.category as VideoCategory] ?? row.category}
            </span>
          </div>
          {row.tags.length > 0 && (
            <p className="mt-1 text-[11.5px] text-zinc-500">
              {row.tags.map((tag) => TAG_LABELS.get(tag) ?? tag).join(" · ")}
            </p>
          )}
          {row.description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-zinc-600">
              {row.description}
            </p>
          )}
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[11.5px] sm:grid-cols-2">
            <Detail label="Creator">
              {row.creatorName}
              {handle && (
                <span className="text-zinc-400">
                  {" "}
                  {handle.startsWith("@") ? handle : `@${handle}`}
                </span>
              )}
            </Detail>
            <Detail label="Submitted by">
              <span className="break-all">{row.submitterEmail}</span>
            </Detail>
            <Detail label="Submitted">
              {dateFormat.format(new Date(row.createdAt))} UTC
            </Detail>
            <Detail label="Duration">
              {formatDuration(row.durationSeconds ?? undefined)}
            </Detail>
            {profile && (
              <Detail label="Profile" wide>
                <ExternalUrl href={profile} />
              </Detail>
            )}
            {row.sourceUrl && (
              <Detail label="Source" wide>
                <ExternalUrl href={row.sourceUrl} />
              </Detail>
            )}
            {row.toolsUsed.length > 0 && (
              <Detail label="Tools" wide>
                {row.toolsUsed.join(", ")}
              </Detail>
            )}
            <Detail label={PROMPT_LABELS[row.promptStatus]} wide>
              {row.promptText ? (
                <span className="block max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-50 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed">
                  {row.promptText}
                </span>
              ) : (
                "—"
              )}
            </Detail>
            {row.negativePrompt && (
              <Detail label="Negative prompt" wide>
                <span className="block whitespace-pre-wrap rounded-lg bg-zinc-50 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed">
                  {row.negativePrompt}
                </span>
              </Detail>
            )}
          </dl>
          <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
            <ApproveForm row={row} />
            <RejectForm row={row} />
          </div>
        </div>
      </div>
    </li>
  );
}

export function VideoReviewList({
  rows,
  total,
}: {
  rows: VideoReviewRow[];
  total: number;
}) {
  return (
    <section aria-label="Videos waiting for review">
      <h2 className="mb-1 font-display text-[16px] font-semibold">
        Waiting for review{" "}
        <span className="text-[12px] font-normal text-zinc-400">{total}</span>
      </h2>
      <p className="mb-4 text-[12px] text-zinc-500">
        Oldest first. New submissions join the bottom of the queue.
        {total > rows.length &&
          ` Showing the first ${rows.length}; the rest appear as these are reviewed.`}
      </p>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-zinc-400">
          No videos are waiting. The queue is clear.
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => (
            <VideoItem key={row.id} row={row} position={index + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}
