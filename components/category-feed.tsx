"use client";

import { useState } from "react";
import { CategoryBar } from "@/components/category-bar";
import { VideoFeed } from "@/components/video-feed";
import type { VideoFeedPage } from "@/lib/video-feed";
import type { VideoCategory } from "@/lib/videos";

/** The category bar and the feed it filters, kept in step with `?category=`. */
export function CategoryFeed({
  categories,
  initialCategory,
  initialPage,
}: {
  categories: VideoCategory[];
  initialCategory?: VideoCategory;
  initialPage?: VideoFeedPage;
}) {
  const [category, setCategory] = useState<VideoCategory | undefined>(
    initialCategory,
  );

  function selectCategory(next: VideoCategory | undefined) {
    if (next === category) return;
    setCategory(next);

    // Shareable without a navigation: Next.js syncs replaceState with its router.
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("category", next);
    else url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <CategoryBar
        categories={categories}
        active={category}
        onChange={selectCategory}
      />
      {/* A new key starts the feed fresh: its own pages, cursor and errors. */}
      <VideoFeed
        key={category ?? "all"}
        category={category}
        initialPage={category === initialCategory ? initialPage : undefined}
      />
    </>
  );
}
