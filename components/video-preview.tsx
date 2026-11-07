"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  CATEGORY_LABELS,
  CURATED_VIDEOS,
  formatAspectRatio,
  formatDuration,
  formatPublishedAt,
  type PromptStatus,
  type VideoMetadata,
} from "@/lib/videos";

interface VideoPreviewProps {
  video: VideoMetadata;
  onClose: () => void;
}

const PROMPT_STATUS: Record<PromptStatus, { label: string; className: string }> = {
  original: {
    label: "Original",
    className: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  },
  reconstructed: {
    label: "Reconstructed",
    className: "border-amber-200/80 bg-amber-50 text-amber-700",
  },
  unavailable: {
    label: "Not shared",
    className: "border-zinc-300/70 bg-white/80 text-zinc-500",
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  vimeo: "Vimeo",
  portfolio: "Portfolio",
  other: "Profile",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function VideoPreview({ video, onClose }: VideoPreviewProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [onClose]);

  const copyPrompt = async () => {
    if (!video.promptText) return;

    try {
      await navigator.clipboard.writeText(video.promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked — the prompt is still selectable.
    }
  };

  const status = PROMPT_STATUS[video.promptStatus];
  const platformLabel = PLATFORM_LABELS[video.creator.platform ?? "other"] ?? "Profile";
  const profileAction =
    video.creator.platform === "portfolio" || video.creator.platform === "other" || !video.creator.platform
      ? "Visit profile"
      : `Open on ${platformLabel}`;

  const similar = CURATED_VIDEOS.filter((item) => item.id !== video.id)
    .sort((a, b) => Number(b.category === video.category) - Number(a.category === video.category))
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={`${video.title} by ${video.creator.name}`}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-white/60 backdrop-blur-[6px]"
      />

      <div
        className="relative flex min-h-full w-full flex-col lg:h-[100dvh] lg:min-h-0 lg:flex-row lg:items-center"
        onClick={onClose}
      >
        {/* Centered in the space between the viewport edge and the sidebar */}
        <div className="flex flex-1 items-center justify-center px-4 pt-4 pb-3 sm:px-6 sm:pt-6 lg:px-6 lg:py-0 xl:px-8">
          <div
            onClick={(event) => event.stopPropagation()}
            style={
              {
                aspectRatio: video.aspectRatio,
                maxWidth: `calc((100dvh - 96px) * ${video.aspectRatio})`,
              } as CSSProperties
            }
            className="skeleton-shimmer relative w-full overflow-hidden rounded-2xl border border-zinc-200/70 shadow-[0_24px_80px_-36px_rgba(9,9,11,0.35)]"
          />
        </div>

        {/* Separate details column on the right — no enclosing panel */}
        <aside
          onClick={(event) => event.stopPropagation()}
          className="w-full bg-white px-4 pt-6 pb-12 sm:px-6 lg:mr-8 lg:h-full lg:w-[296px] lg:shrink-0 lg:overflow-y-auto lg:px-6 lg:py-10 xl:mr-10 xl:w-[312px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto w-full max-w-[520px] lg:mx-0">
            <h2 className="font-display text-[21px] font-semibold leading-[1.12] tracking-tight text-zinc-900 sm:text-[23px]">
              {video.title}
            </h2>
            {video.description && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-500">
                {video.description}
              </p>
            )}

            <div className="mt-5 space-y-2">
              <a
                href={video.creator.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-zinc-200/60 bg-white p-2.5 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10.5px] font-semibold tracking-wide text-white">
                  {initials(video.creator.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-zinc-900">
                    {video.creator.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500">
                    {video.creator.handle ?? platformLabel}
                  </span>
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white transition-transform duration-150 group-hover:scale-105">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              </a>

              <a
                href={video.creator.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-full border border-zinc-200/60 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:bg-white hover:text-zinc-950"
              >
                {profileAction}
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.9} />
              </a>
            </div>

            <div className="mt-3 space-y-2">
              {video.promptText ? (
                <>
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="flex w-full items-center justify-between rounded-full border border-white/20 bg-[#3074FE] px-4 py-2.5 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(48,116,254,0.28)] transition-[background-color,transform] duration-150 hover:bg-[#2568f2] active:scale-[0.99]"
                  >
                    {copied ? "Prompt copied" : "Copy prompt"}
                    {copied ? (
                      <Check className="h-4 w-4" strokeWidth={2.2} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.9} />
                    )}
                  </button>

                  <a
                    href={video.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-full border border-zinc-200/60 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:bg-white hover:text-zinc-950"
                  >
                    View original
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.9} />
                  </a>
                </>
              ) : (
                <a
                  href={video.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between rounded-full border border-white/20 bg-[#3074FE] px-4 py-2.5 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(48,116,254,0.28)] transition-colors duration-150 hover:bg-[#2568f2]"
                >
                  View original
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.9} />
                </a>
              )}
            </div>

            <dl className="mt-5 border-t border-dashed border-zinc-300/70">
              {[
                { label: "Category", value: CATEGORY_LABELS[video.category] },
                { label: "Tools", value: video.toolsUsed?.join(", ") ?? "—" },
                { label: "Aspect", value: formatAspectRatio(video.aspectRatio) },
                { label: "Duration", value: formatDuration(video.durationSeconds) },
                { label: "Published", value: formatPublishedAt(video.publishedAt) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-5 border-b border-dashed border-zinc-300/70 py-2.5"
                >
                  <dt className="shrink-0 text-[12.5px] text-zinc-500">{row.label}</dt>
                  <dd className="max-w-[62%] text-right text-[12.5px] font-medium leading-relaxed text-zinc-800">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Prompt
                </h3>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-2 rounded-2xl border border-zinc-200/60 bg-white p-3.5">
                <p className="text-[12.5px] leading-relaxed text-zinc-600">
                  {video.promptText ??
                    "The creator has not shared a prompt for this piece."}
                </p>
              </div>
              {video.negativePrompt && (
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                  <span className="font-medium text-zinc-500">Negative:</span>{" "}
                  {video.negativePrompt}
                </p>
              )}
            </section>

            <section className="mt-3">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Tags
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {video.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-200/50 bg-white px-2 py-1 text-[10.5px] font-medium text-zinc-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>

            {video.curatorNotes && (
              <section className="mt-4 rounded-2xl border border-[#3074FE]/15 bg-[#3074FE]/[0.05] p-3.5">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#3074FE]/80">
                  Curator&apos;s note
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
                  {video.curatorNotes}
                </p>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-zinc-200/60 bg-white p-3">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Similar motions
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {similar.map((item) => (
                  <div key={item.id}>
                    <div
                      className="skeleton-shimmer relative overflow-hidden rounded-lg border border-zinc-200/60"
                      style={{ aspectRatio: 4 / 3 }}
                    />
                    <p className="mt-1 truncate text-[10.5px] font-medium text-zinc-700">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <p className="mt-6 text-[10.5px] text-zinc-400">
              Curated by Eizoki — every piece is credited to its creator.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
