import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { VideoLinkGrid } from "@/components/video-link-grid";
import { CATEGORY_LANDINGS } from "@/lib/seo-categories";
import { listLatestPublicVideos, readForPage } from "@/lib/services/public-videos";
import { CATEGORY_LABELS, type VideoCategory } from "@/lib/videos";

/** Article typography, applied to plain elements so posts stay easy to write. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "text-[15px] leading-[1.75] text-zinc-600",
        "[&>p]:mt-4",
        "[&>h2]:mt-11 [&>h2]:font-display [&>h2]:text-[19px] [&>h2]:font-semibold [&>h2]:leading-snug [&>h2]:tracking-[-0.01em] [&>h2]:text-zinc-900",
        "[&>h3]:mt-7 [&>h3]:font-display [&>h3]:text-[15.5px] [&>h3]:font-semibold [&>h3]:text-zinc-900",
        "[&>ul]:mt-4 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul]:marker:text-zinc-400",
        "[&>ol]:mt-4 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5 [&>ol]:marker:text-zinc-400",
        "[&_strong]:font-semibold [&_strong]:text-zinc-800",
        // Only links in running text; example cards inside the article keep their own style.
        "[&>:is(p,ul,ol)_a]:font-medium [&>:is(p,ul,ol)_a]:text-zinc-800 [&>:is(p,ul,ol)_a]:underline [&>:is(p,ul,ol)_a]:decoration-zinc-300 [&>:is(p,ul,ol)_a]:underline-offset-2 [&>:is(p,ul,ol)_a:hover]:decoration-zinc-500",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** An example prompt, set apart from the article text. */
export function PromptExample({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="mt-5 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
      <figcaption className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </figcaption>
      <p className="mt-2 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-zinc-700">
        {children}
      </p>
    </figure>
  );
}

async function ExampleVideos({
  category,
  limit,
}: {
  category: VideoCategory;
  limit: number;
}) {
  const videos = await readForPage("Blog examples", () =>
    listLatestPublicVideos({ category, limit }),
  );
  if (!videos?.length) return null;
  return <VideoLinkGrid videos={videos} columns="sm:grid-cols-3" />;
}

/**
 * Real, current examples from the collection, so a guide always points at
 * videos readers can study rather than at descriptions of them.
 */
export function LiveExamples({
  category,
  limit = 6,
  heading,
}: {
  category: VideoCategory;
  limit?: number;
  heading?: string;
}) {
  const landing = CATEGORY_LANDINGS[category];
  return (
    <aside className="my-10 rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[15px] font-semibold text-zinc-900">
          {heading ?? `${CATEGORY_LABELS[category]} examples`}
        </h2>
        <Link
          href={landing.path}
          className="shrink-0 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900"
        >
          See all →
        </Link>
      </div>
      <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
        <ExampleVideos category={category} limit={limit} />
      </Suspense>
    </aside>
  );
}
