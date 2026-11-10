import Link from "next/link";
import { Film } from "lucide-react";
import { videoPath } from "@/lib/seo";
import type { VideoMetadata } from "@/lib/videos";

/**
 * Server-rendered poster links to video pages. Crawlers follow these, so
 * every video page is reachable from category, tag, blog and video pages
 * without running the client feed.
 */
export function VideoLinkGrid({
  videos,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  videos: Pick<VideoMetadata, "slug" | "title" | "posterUrl" | "creator">[];
  columns?: string;
}) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${columns}`}>
      {videos.map((video) => (
        <li key={video.slug}>
          <Link
            href={videoPath(video.slug)}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-100 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
              {video.posterUrl ? (
                // Posters are already sized WebP; see VideoCard.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.posterUrl}
                  alt={`Still from ${video.title}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-zinc-400">
                  <Film className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="mt-2 block truncate text-[12.5px] font-medium text-zinc-800 group-hover:text-zinc-950">
              {video.title}
            </span>
            <span className="block truncate text-[11.5px] text-zinc-500">
              by {video.creator.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Section heading for the indexable pages, matching the About page. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
      {children}
    </h2>
  );
}
