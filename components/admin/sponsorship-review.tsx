"use client";

import { useActionState, useState } from "react";
import { ExternalLink, Globe, LoaderCircle } from "lucide-react";
import {
  approveAction,
  cancelAction,
  rejectAction,
  type ReviewState,
} from "@/app/admin/sponsorships/actions";
import {
  SPONSOR_CAPACITY,
  SPONSORSHIP_LABELS,
  sponsorshipEndsAt,
  type SponsorshipPlacement,
} from "@/lib/sponsorships";

export interface ReviewRow {
  id: string;
  placement: SponsorshipPlacement;
  status:
    | "PENDING_PAYMENT"
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";
  productName: string;
  websiteUrl: string;
  description: string | null;
  contactEmail: string | null;
  iconUrl: string | null;
  videoUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  bookedByEmail: string | null;
}

const INITIAL: ReviewState = { error: null };

// All review dates are UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "—";
}

/** `YYYY-MM-DD` in UTC, for a date input. */
function utcDateValue(value: string) {
  return value.slice(0, 10);
}

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

function ErrorText({ state }: { state: ReviewState }) {
  return state.error ? (
    <p role="alert" className="mt-2 text-[12px] text-red-600">
      {state.error}
    </p>
  ) : null;
}

function ApproveForm({ row, now }: { row: ReviewRow; now: string }) {
  const [state, dispatch, pending] = useActionState(approveAction, INITIAL);
  const [start, setStart] = useState(() => utcDateValue(row.startsAt ?? now));
  // The date means 00:00 UTC; the action treats a past time as now.
  const startsAt = new Date(`${start}T00:00:00Z`);
  const valid = !Number.isNaN(startsAt.getTime());
  return (
    <form action={dispatch} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={row.id} />
      <input
        type="hidden"
        name="startsAt"
        value={valid ? startsAt.toISOString() : ""}
      />
      <label className="text-[11px] text-zinc-500">
        Starts (UTC)
        <input
          type="date"
          required
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className={`${fieldClass} mt-1 block`}
        />
      </label>
      <span className="pb-2 text-[11px] text-zinc-400">
        ends {valid ? dateFormat.format(sponsorshipEndsAt(startsAt)) : "—"}
      </span>
      <button
        type="submit"
        disabled={pending || !valid}
        className={`${buttonClass} bg-brand text-white hover:bg-brand-600`}
      >
        {pending && <Pending />}
        {row.status === "APPROVED" ? "Reschedule" : "Approve"}
      </button>
      <div className="basis-full">
        <ErrorText state={state} />
      </div>
    </form>
  );
}

function RejectForm({ row }: { row: ReviewRow }) {
  const [state, dispatch, pending] = useActionState(rejectAction, INITIAL);
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

function CancelForm({ row }: { row: ReviewRow }) {
  const [state, dispatch, pending] = useActionState(cancelAction, INITIAL);
  return (
    <form
      action={dispatch}
      onSubmit={(event) => {
        if (!window.confirm(`Take ${row.productName} down now?`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={row.id} />
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
      >
        {pending && <Pending />}
        Take down
      </button>
      <ErrorText state={state} />
    </form>
  );
}

function SponsorshipItem({ row, now }: { row: ReviewRow; now: Date }) {
  const [iconFailed, setIconFailed] = useState(false);
  const live =
    row.status === "APPROVED" &&
    row.startsAt !== null &&
    new Date(row.startsAt) <= now;
  const statusLabel =
    row.status === "APPROVED"
      ? live
        ? "Live"
        : "Scheduled"
      : row.status === "PENDING_REVIEW"
        ? "Waiting for review"
        : row.status === "PENDING_PAYMENT"
          ? "Awaiting payment"
          : row.status === "REJECTED"
            ? "Rejected"
            : row.endsAt && new Date(row.endsAt) <= now
              ? "Ended"
              : "Cancelled";

  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-400">
          {row.iconUrl && !iconFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.iconUrl}
              alt=""
              width={40}
              height={40}
              referrerPolicy="no-referrer"
              onError={() => setIconFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <Globe className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-medium text-zinc-900">
              {row.productName}
            </h3>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-zinc-600">
              {SPONSORSHIP_LABELS[row.placement]}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10.5px] ${live ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand"}`}
            >
              {statusLabel}
            </span>
          </div>
          <a
            href={row.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex max-w-full items-center gap-1 break-all text-[12px] text-zinc-500 hover:text-zinc-800"
          >
            {row.websiteUrl}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
          {row.description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-zinc-600">
              {row.description}
            </p>
          )}
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[11.5px] sm:grid-cols-2">
            <div>
              <dt className="text-zinc-400">Contact</dt>
              <dd className="break-all text-zinc-700">
                {row.contactEmail ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Account</dt>
              <dd className="break-all text-zinc-700">
                {row.bookedByEmail ?? "Arranged directly"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Booked</dt>
              <dd className="text-zinc-700">{formatDate(row.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Runs</dt>
              <dd className="text-zinc-700">
                {row.startsAt
                  ? `${formatDate(row.startsAt)} – ${formatDate(row.endsAt)}`
                  : "Not scheduled"}
              </dd>
            </div>
            {row.reviewNotes && (
              <div className="sm:col-span-2">
                <dt className="text-zinc-400">Note</dt>
                <dd className="text-zinc-700">{row.reviewNotes}</dd>
              </div>
            )}
          </dl>
          {row.videoUrl && (
            <video
              src={row.videoUrl}
              controls
              muted
              playsInline
              preload="metadata"
              className="mt-3 max-h-64 w-full rounded-xl bg-zinc-100 object-contain"
            />
          )}
          {row.status === "PENDING_REVIEW" && (
            <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
              <ApproveForm row={row} now={now.toISOString()} />
              <RejectForm row={row} />
            </div>
          )}
          {row.status === "APPROVED" && (
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-4">
              <ApproveForm row={row} now={now.toISOString()} />
              <CancelForm row={row} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  now,
  empty,
}: {
  title: string;
  rows: ReviewRow[];
  now: Date;
  empty: string;
}) {
  return (
    <section className="mt-8 first:mt-0" aria-label={title}>
      <h2 className="mb-3 font-display text-[16px] font-semibold">
        {title}{" "}
        <span className="text-[12px] font-normal text-zinc-400">
          {rows.length}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-zinc-400">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <SponsorshipItem key={row.id} row={row} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SponsorshipReviewList({
  rows,
  now: nowIso,
}: {
  rows: ReviewRow[];
  now: string;
}) {
  const now = new Date(nowIso);
  const current = (row: ReviewRow) =>
    row.status === "APPROVED" && row.endsAt !== null && new Date(row.endsAt) > now;
  const waiting = rows.filter(
    (row) => row.status === "PENDING_REVIEW" || row.status === "PENDING_PAYMENT",
  );
  const scheduled = rows
    .filter(current)
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  const past = rows.filter(
    (row) => !waiting.includes(row) && !scheduled.includes(row),
  );
  const liveCount = (placement: SponsorshipPlacement) =>
    scheduled.filter(
      (row) =>
        row.placement === placement &&
        row.startsAt !== null &&
        new Date(row.startsAt) <= now,
    ).length;

  return (
    <>
      <p className="mb-6 text-[12px] text-zinc-500">
        Live now: navbar {liveCount("NAVBAR")}/{SPONSOR_CAPACITY.NAVBAR} · feed{" "}
        {liveCount("FEED_VIDEO")}/{SPONSOR_CAPACITY.FEED_VIDEO}
      </p>
      <Section
        title="Waiting for review"
        rows={waiting}
        now={now}
        empty="No bookings are waiting."
      />
      <Section
        title="Live and scheduled"
        rows={scheduled}
        now={now}
        empty="Nothing is live or scheduled."
      />
      <Section
        title="Past"
        rows={past}
        now={now}
        empty="No past bookings yet."
      />
    </>
  );
}
