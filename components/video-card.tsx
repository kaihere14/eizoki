"use client";

import { useRef, useState } from "react";
import { useViewportVideo } from "@/components/use-viewport-video";
import { Film } from "lucide-react";
import { visualSeed, type VideoMetadata } from "@/lib/videos";

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
 * A masonry card whose shimmer stays visible until the first video frame is
 * decoded, so a slow asset never collapses into an empty or broken card.
 */
export function VideoCard({
  video,
  onOpen,
  paused = false,
  className,
}: {
  video: VideoMetadata;
  onOpen: (video: VideoMetadata) => void;
  paused?: boolean;
  className?: string;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const { videoRef, shouldLoad } = useViewportVideo(cardRef, paused);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | undefined>(video.aspectRatio);

  const placeholderRatio =
    PLACEHOLDER_RATIOS[visualSeed(video.id) % PLACEHOLDER_RATIOS.length];

  return (
    <div className={`break-inside-avoid ${className ?? "mb-3 sm:mb-4"}`}>
      <button
        ref={cardRef}
        type="button"
        onClick={() => onOpen(video)}
        aria-label={`Preview ${video.title} by ${video.creator.name}`}
        aria-haspopup="dialog"
        style={{ aspectRatio: ratio ?? placeholderRatio }}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-200/70 text-left shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-shadow duration-200 ease-out group-hover:shadow-[0_10px_28px_-14px_rgba(9,9,11,0.2)] ${
          ready || failed ? "bg-zinc-100" : "skeleton-shimmer"
        }`}
      >
        {shouldLoad && (
          <video
            ref={videoRef}
            src={video.videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={(event) => {
              const element = event.currentTarget;
              if (element.videoWidth && element.videoHeight) {
                setRatio(element.videoWidth / element.videoHeight);
              }
            }}
            onLoadedData={() => setReady(true)}
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
    </div>
  );
}
