"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Film, Trash2 } from "lucide-react";
import { animateFavouriteSave } from "@/lib/favourite-animation";
import { FavouriteButton } from "@/components/favourite-button";
import { useViewportVideo } from "@/components/use-viewport-video";
import { promptWithVideoReference } from "@/lib/video-reference";
import {
  originalVideoUrl,
  visualSeed,
  type VideoMetadata,
} from "@/lib/videos";

const CARD_ACTION_CLASS =
  "card-action inline-flex items-center justify-center rounded-full text-zinc-800 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-brand";

const PLACEHOLDER_RATIOS = [
  4 / 5,
  16 / 10,
  1,
  3 / 4,
  4 / 3,
  5 / 6,
  16 / 11,
] as const;

/**
 * A masonry card. Its poster frame shows as soon as it arrives (a few dozen
 * KB) and the video fades in over it once its first frame is decoded. Cards
 * without a poster keep their shimmer until then, so a slow asset never
 * collapses into an empty or broken card.
 */
export function VideoCard({
  video,
  onOpen,
  paused = false,
  className,
  onDelete,
}: {
  video: VideoMetadata;
  onOpen: (video: VideoMetadata) => void;
  paused?: boolean;
  className?: string;
  /** Shown only to admins on the feed; the server authorises the delete. */
  onDelete?: (video: VideoMetadata) => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const { videoRef, shouldLoad, loadId } = useViewportVideo(cardRef, paused);
  // The load whose first frame is showing; an unload starts a new load.
  const [readyLoad, setReadyLoad] = useState(0);
  const ready = shouldLoad && readyLoad === loadId;
  const [posterReady, setPosterReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | undefined>(video.aspectRatio);
  const [copied, setCopied] = useState(false);
  const cancelSaveAnimation = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelSaveAnimation.current?.(), []);

  function animateSave() {
    cancelSaveAnimation.current?.();
    if (cardRef.current) {
      cancelSaveAnimation.current = animateFavouriteSave(cardRef.current);
    }
  }

  const placeholderRatio =
    PLACEHOLDER_RATIOS[visualSeed(video.id) % PLACEHOLDER_RATIOS.length];
  const originalUrl = originalVideoUrl(video);

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
      // Clipboard access can be blocked; the preview still shows the prompt.
    }
  };

  return (
    <div
      className={`group/card relative break-inside-avoid ${className ?? "mb-3 sm:mb-4"}`}
    >
      <button
        ref={cardRef}
        type="button"
        onClick={() => onOpen(video)}
        aria-label={`Preview ${video.title} by ${video.creator.name}`}
        aria-haspopup="dialog"
        style={{ aspectRatio: ratio ?? placeholderRatio }}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-200/70 text-left shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-shadow duration-200 ease-out group-hover:shadow-[0_10px_28px_-14px_rgba(9,9,11,0.2)] ${
          ready || posterReady || failed ? "bg-zinc-100" : "skeleton-shimmer"
        }`}
      >
        {video.posterUrl && !failed && (
          // Posters are already 720px WebP; the Next.js optimizer would only
          // re-process them per request.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.posterUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onLoad={() => setPosterReady(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              posterReady ? "opacity-100" : "opacity-0"
            }`}
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
            onLoadedMetadata={(event) => {
              const element = event.currentTarget;
              if (element.videoWidth && element.videoHeight) {
                setRatio(element.videoWidth / element.videoHeight);
              }
            }}
            onLoadedData={() => setReadyLoad(loadId)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {failed && (
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-400">
            <Film className="h-6 w-6" strokeWidth={1.4} aria-hidden="true" />
          </span>
        )}
      </button>

      {/* Hover actions float above the card; keyboard focus reveals them too. */}
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/card:pointer-events-auto group-hover/card:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100 motion-reduce:transition-none">
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open original for ${video.title}`}
            title="View original"
            className={CARD_ACTION_CLASS}
          >
            <ArrowUpRight
              className="h-3 w-3"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </a>
        )}

        <button
          type="button"
          onClick={copyPrompt}
          aria-label={
            copied ? "Prompt copied" : `Copy prompt for ${video.title}`
          }
          title={copied ? "Prompt copied" : "Copy prompt"}
          className={CARD_ACTION_CLASS}
        >
          {copied ? (
            <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>

        <FavouriteButton
          compact
          variant="overlay"
          onSaveComplete={animateSave}
          videoId={video.id}
          videoTitle={video.title}
        />

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(video)}
            aria-label={`Delete ${video.title}`}
            title="Delete video"
            className={`${CARD_ACTION_CLASS} hover:!text-red-600`}
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
