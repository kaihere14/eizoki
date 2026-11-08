"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Film, Globe } from "lucide-react";
import { useViewportVideo } from "@/components/use-viewport-video";
import type { PublicFeedSponsor } from "@/lib/sponsorships";

/**
 * A paid placement in the feed. It looks like the editorial cards but is
 * always labelled, links straight to the sponsor, and has no prompt or save
 * actions because it is not part of the catalogue.
 */
export function SponsoredVideoCard({
  sponsor,
  paused = false,
  className,
}: {
  sponsor: PublicFeedSponsor;
  paused?: boolean;
  className?: string;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { videoRef, shouldLoad } = useViewportVideo(cardRef, paused);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState(16 / 10);
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <div className={`break-inside-avoid ${className ?? "mb-3 sm:mb-4"}`}>
      <a
        ref={cardRef}
        href={sponsor.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`Sponsored: ${sponsor.productName} — opens in a new tab`}
        className="group block overflow-hidden rounded-xl border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] outline-none transition-shadow duration-200 ease-out hover:shadow-[0_10px_28px_-14px_rgba(9,9,11,0.2)] focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div
          style={{ aspectRatio: ratio }}
          className={`relative ${ready || failed ? "bg-zinc-100" : "skeleton-shimmer"}`}
        >
          {shouldLoad && !failed && (
            <video
              ref={videoRef}
              src={sponsor.videoUrl}
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
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
            />
          )}
          {failed && (
            <span className="absolute inset-0 flex items-center justify-center text-zinc-400">
              <Film className="h-6 w-6" strokeWidth={1.4} aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-zinc-200/90 bg-white text-zinc-400">
            {sponsor.iconUrl && !iconFailed ? (
              // Sponsor icons come from ImageKit or the sponsor's own site.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.iconUrl}
                alt=""
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                onError={() => setIconFailed(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-zinc-800">
              {sponsor.productName}
            </span>
            {sponsor.description && (
              <span className="block truncate text-[11px] text-zinc-500">
                {sponsor.description}
              </span>
            )}
          </span>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand">
            Sponsored
          </span>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700"
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </div>
      </a>
    </div>
  );
}
