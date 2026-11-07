"use client";

import { useState } from "react";
import { VideoPreview } from "@/components/video-preview";
import { CURATED_VIDEOS, type VideoMetadata } from "@/lib/videos";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function VideoFeed() {
  const [selected, setSelected] = useState<VideoMetadata | null>(null);

  return (
    <>
      <div className="columns-2 gap-3 sm:gap-4 lg:columns-3 xl:columns-4">
        {CURATED_VIDEOS.map((video) => (
          <div key={video.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setSelected(video)}
              aria-label={`Preview ${video.title} by ${video.creator.name}`}
              aria-haspopup="dialog"
              style={{ aspectRatio: video.aspectRatio }}
              className="skeleton-shimmer group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-200/70 text-left shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-shadow duration-200 ease-out group-hover:shadow-[0_10px_28px_-14px_rgba(9,9,11,0.2)]"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[5px] font-semibold tracking-wide text-white ring-1 ring-white/80 shadow-[0_1px_3px_rgba(9,9,11,0.15)] sm:h-[18px] sm:w-[18px] sm:text-[6px]"
              >
                {initials(video.creator.name)}
              </span>
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <VideoPreview video={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
