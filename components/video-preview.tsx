"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { AVATAR_IMAGES } from "@/lib/user";
import { FavouriteButton } from "@/components/favourite-button";
import { useViewportVideo } from "@/components/use-viewport-video";
import {
  promptWithVideoReference,
  videoReferencePath,
} from "@/lib/video-reference";
import { ArrowUpRight, Check, Copy, Film } from "lucide-react";
import {
  CATEGORY_LABELS,
  formatAspectRatio,
  formatDuration,
  formatPublishedAt,
  originalVideoUrl,
  type PromptStatus,
  type VideoMetadata,
} from "@/lib/videos";

interface VideoPreviewProps {
  video: VideoMetadata;
  similar?: VideoMetadata[];
  onSelect?: (video: VideoMetadata) => void;
  onClose: () => void;
}

function PreviewMedia({
  video,
  ratio,
  onRatioChange,
}: {
  video: VideoMetadata;
  ratio?: number;
  onRatioChange: (ratio: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const effectiveRatio = ratio ?? 4 / 5;

  // Opening a preview is a user gesture, so the player can start with sound.
  // If the browser still blocks it, the native controls remain available.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = false;
    element.volume = 1;
    element.play().catch(() => {
      // Autoplay with sound can still be blocked by strict browser policies.
    });
  }, [video.id]);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={
        {
          aspectRatio: effectiveRatio,
          maxWidth: `calc((100dvh - 96px) * ${effectiveRatio})`,
        } as CSSProperties
      }
      className={`relative w-full overflow-hidden rounded-2xl border border-zinc-200/70 shadow-[0_24px_80px_-36px_rgba(9,9,11,0.35)] ${ready || failed ? "bg-zinc-100" : "skeleton-shimmer"}`}
    >
      <video
        ref={videoRef}
        key={video.id}
        src={video.videoUrl}
        poster={video.posterUrl}
        controls
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-label={`${video.title} by ${video.creator.name}`}
        onLoadedMetadata={(event) => {
          const element = event.currentTarget;
          if (element.videoWidth && element.videoHeight) {
            onRatioChange(element.videoWidth / element.videoHeight);
          }
        }}
        onLoadedData={() => setReady(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full bg-zinc-950 object-contain transition-opacity duration-300 ${
          ready || video.posterUrl ? "opacity-100" : "opacity-0"
        }`}
      />

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 text-zinc-500">
          <Film className="h-7 w-7" strokeWidth={1.4} aria-hidden="true" />
          <p className="text-[12px]">This video could not be played.</p>
        </div>
      )}
    </div>
  );
}

function MiniVideo({ video }: { video: VideoMetadata }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { videoRef, shouldLoad, loadId } = useViewportVideo(containerRef);
  const [readyLoad, setReadyLoad] = useState(0);
  const ready = shouldLoad && readyLoad === loadId;
  const [posterReady, setPosterReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg border border-zinc-200/60 bg-zinc-100 ${ready || posterReady || failed ? "" : "skeleton-shimmer"}`}
      style={{ aspectRatio: 4 / 3 }}
    >
      {video.posterUrl && !failed && (
        // Already a sized WebP; see VideoCard.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.posterUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setPosterReady(true)}
          className={`absolute inset-0 h-full w-full object-cover ${posterReady ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {shouldLoad && (
        <video
          ref={videoRef}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onLoadedData={() => setReadyLoad(loadId)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center text-zinc-400">
          <Film className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

const PROMPT_STATUS: Record<
  PromptStatus,
  { label: string; className: string }
> = {
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

export function VideoPreview({
  video,
  similar = [],
  onSelect,
  onClose,
}: VideoPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [mediaRatio, setMediaRatio] = useState<number | undefined>(
    video.aspectRatio,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

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
    try {
      await navigator.clipboard.writeText(
        promptWithVideoReference(
          video.promptText,
          video.id,
          window.location.origin,
        ),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked — the prompt is still selectable.
    }
  };

  const status = PROMPT_STATUS[video.promptStatus];
  const hasPrompt = Boolean(video.promptText?.trim());
  const profileUrl = video.creator.xProfileUrl ?? video.creator.profileUrl;
  const isXProfile =
    Boolean(video.creator.xProfileUrl) || video.creator.platform === "x";
  const platformLabel = isXProfile
    ? "X"
    : (PLATFORM_LABELS[video.creator.platform ?? "other"] ?? "Profile");
  const profileAction = isXProfile
    ? "Open on X"
    : video.creator.platform === "portfolio" ||
        video.creator.platform === "other" ||
        !video.creator.platform
      ? "Visit profile"
      : `Open on ${platformLabel}`;
  const originalUrl = originalVideoUrl(video);

  const related = similar
    .filter((item) => item.id !== video.id)
    .sort(
      (a, b) =>
        Number(b.category === video.category) -
        Number(a.category === video.category),
    )
    .slice(0, 4);

  const creatorDetails = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
        <Image
          src={video.creator.avatarUrl ?? AVATAR_IMAGES.BOY}
          alt="Uploader avatar"
          width={36}
          height={36}
          sizes="36px"
          className={`h-9 w-9 object-contain ${!video.creator.avatarUrl || Object.values(AVATAR_IMAGES).includes(video.creator.avatarUrl) ? "dark:invert" : ""}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-zinc-900">
          {video.creator.name}
        </span>
        <span className="block truncate text-[11px] text-zinc-500">
          Creator
        </span>
      </span>
    </>
  );

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
          <PreviewMedia
            video={video}
            ratio={mediaRatio}
            onRatioChange={setMediaRatio}
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
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/60 bg-white p-2.5 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
                {creatorDetails}
              </div>

              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-full border border-zinc-200/60 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:bg-white hover:text-zinc-950"
                >
                  <span>{profileAction}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    {isXProfile && video.creator.handle && (
                      <span className="max-w-36 truncate text-[11.5px] text-zinc-500">
                        {video.creator.handle}
                      </span>
                    )}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-zinc-400"
                      strokeWidth={1.9}
                    />
                  </span>
                </a>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <FavouriteButton videoId={video.id} videoTitle={video.title} />
              <button
                type="button"
                onClick={copyPrompt}
                className="flex w-full items-center justify-between rounded-full border border-white/20 bg-[#d6336c] px-4 py-2.5 text-[13px] font-medium text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(214,51,108,0.3)] outline-none transition-[background-color,transform] duration-150 hover:bg-[#bf2560] focus-visible:ring-2 focus-visible:ring-[#d6336c] focus-visible:ring-offset-2 motion-safe:active:scale-[0.99]"
              >
                {copied ? "Prompt copied" : "Copy prompt"}
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.9} />
                )}
              </button>
              {originalUrl && (
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-full border border-zinc-200/60 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:bg-white hover:text-zinc-950"
                >
                  View original
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-zinc-400"
                    strokeWidth={1.9}
                  />
                </a>
              )}
            </div>

            <dl className="mt-5 border-t border-dashed border-zinc-300/70">
              {[
                { label: "Category", value: CATEGORY_LABELS[video.category] },
                { label: "Tools", value: video.toolsUsed?.join(", ") ?? "—" },
                { label: "Aspect", value: formatAspectRatio(mediaRatio) },
                {
                  label: "Duration",
                  value: formatDuration(video.durationSeconds),
                },
                {
                  label: "Published",
                  value: formatPublishedAt(video.publishedAt),
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-5 border-b border-dashed border-zinc-300/70 py-2.5"
                >
                  <dt className="shrink-0 text-[12.5px] text-zinc-500">
                    {row.label}
                  </dt>
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
                {hasPrompt && (
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-600">
                    {video.promptText}
                  </p>
                )}
                <p
                  className={`${hasPrompt ? "mt-3 border-t border-zinc-100 pt-3 " : ""}text-[12px] leading-relaxed text-zinc-500`}
                >
                  Please use this video as the reference:
                  <br />
                  <a
                    href={videoReferencePath(video.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                  >
                    Reference video
                  </a>
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
                    className="rounded-full border border-white bg-[linear-gradient(180deg,var(--raised-mid)_0%,var(--raised-sunken)_100%)] px-2.5 py-1 text-[10.5px] font-medium text-zinc-600 shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.05),0_1px_1px_rgba(9,9,11,0.05),0_3px_8px_-3px_rgba(9,9,11,0.10)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {video.curatorNotes && (
              <section className="mt-4 rounded-2xl border border-brand/15 bg-brand/[0.05] p-3.5">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand/80">
                  Curator&apos;s note
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
                  {video.curatorNotes}
                </p>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-4 rounded-2xl border border-zinc-200/60 bg-white p-3">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Similar motions
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect?.(item)}
                      disabled={!onSelect}
                      className="group text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <MiniVideo video={item} />
                      <p className="mt-1 truncate text-[10.5px] font-medium text-zinc-700 group-hover:text-zinc-950">
                        {item.title}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <p className="mt-6 text-[10.5px] text-zinc-400">
              Curated by Eizoki — every piece is credited to its creator.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
