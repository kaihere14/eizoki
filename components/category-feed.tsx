"use client";

import { useEffect, useState } from "react";
import { CategoryBar } from "@/components/category-bar";
import { VideoFeed } from "@/components/video-feed";
import type { VideoFeedPage } from "@/lib/video-feed";
import { CATEGORY_LABELS, type VideoCategory } from "@/lib/videos";

const CATEGORY_SLUGS = Object.keys(CATEGORY_LABELS) as VideoCategory[];

function parseCategory(value: string | null): VideoCategory | undefined {
  return value && (CATEGORY_SLUGS as string[]).includes(value)
    ? (value as VideoCategory)
    : undefined;
}

/**
 * The category bar and the feed it filters, kept in step with `?category=`.
 * The server renders the unfiltered feed so the page can be prerendered; a
 * shared `?category=` link switches to that category after hydration.
 */
export function CategoryFeed({
  categories,
  initialPage,
}: {
  categories: VideoCategory[];
  /** The first page of the unfiltered feed. */
  initialPage?: VideoFeedPage;
}) {
  const [category, setCategory] = useState<VideoCategory | undefined>();

  useEffect(() => {
    const linked = parseCategory(
      new URLSearchParams(window.location.search).get("category"),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is only readable in the browser
    if (linked) setCategory(linked);
  }, []);

  function selectCategory(next: VideoCategory | undefined) {
    if (next === category) return;
    setCategory(next);

    // Shareable without a navigation: Next.js syncs replaceState with its router.
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("category", next);
    else url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  }

  // Keep a linked category visible even if it has no public videos yet.
  const barCategories = CATEGORY_SLUGS.filter(
    (slug) => categories.includes(slug) || slug === category,
  );

  return (
    <>
      <CategoryBar
        categories={barCategories}
        active={category}
        onChange={selectCategory}
      />
      {/* A new key starts the feed fresh: its own pages, cursor and errors. */}
      <VideoFeed
        key={category ?? "all"}
        category={category}
        initialPage={category ? undefined : initialPage}
      />
    </>
  );
}
