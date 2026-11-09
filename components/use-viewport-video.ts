"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { requestLoadSlot, type LoadSlot } from "@/components/video-load-queue";

/** Start loading shortly before a card scrolls into view. */
const LOAD_MARGIN = "400px 0px";

/**
 * Beyond this distance a loaded video is unloaded: its buffered data is freed
 * and the card falls back to its poster. Scrolling back loads it again,
 * usually from the browser's HTTP cache.
 */
const KEEP_MARGIN = "1600px 0px";

/**
 * Position in the load queue: cards on screen first, top to bottom, then the
 * ones just outside it, nearest first.
 */
function viewportRank(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight;
  if (rect.bottom > 0 && rect.top < height) return rect.top;
  return height + (rect.top >= height ? rect.top - height : -rect.bottom);
}

/**
 * Load a card's video through the shared queue when it comes near the
 * viewport, autoplay it while it is on screen, and unload it once it is far
 * away.
 *
 * `loadId` changes every time the video is (re)loaded, so a card can tell a
 * first frame of the current load from one it saw before an unload.
 */
export function useViewportVideo(
  containerRef: RefObject<HTMLElement | null>,
  paused = false,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotRef = useRef<LoadSlot | null>(null);
  const [loadId, setLoadId] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const load = () => {
      setLoadId((id) => id + 1);
      setLoaded(true);
    };

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => {
        load();
        setInViewport(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const drop = () => {
      slotRef.current?.release();
      slotRef.current = null;
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          slotRef.current ??= requestLoadSlot(() => viewportRank(container), load);
        } else if (slotRef.current?.waiting) {
          // Scrolled past before its turn came: never load it.
          drop();
        }
      },
      { rootMargin: LOAD_MARGIN },
    );
    const keep = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return;
        drop();
        setLoaded(false);
      },
      { rootMargin: KEEP_MARGIN },
    );
    const visibility = new IntersectionObserver(([entry]) => {
      setInViewport(entry.isIntersecting && entry.intersectionRatio > 0);
    });

    near.observe(container);
    keep.observe(container);
    visibility.observe(container);
    return () => {
      near.disconnect();
      keep.disconnect();
      visibility.disconnect();
      drop();
    };
  }, [containerRef]);

  // Hand the slot to the next card once this one shows its first frame, and
  // free the decoder and buffer when the video is unloaded.
  useEffect(() => {
    const media = videoRef.current;
    if (!loaded || !media) return;
    const finish = () => slotRef.current?.release();
    media.addEventListener("loadeddata", finish);
    media.addEventListener("error", finish);
    if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish();
    return () => {
      media.removeEventListener("loadeddata", finish);
      media.removeEventListener("error", finish);
      media.pause();
      // Dropping the element alone does not stop its download right away.
      media.removeAttribute("src");
      media.load();
    };
  }, [loaded, loadId]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const syncPlayback = () => {
      if (inViewport && !paused && document.visibilityState !== "hidden") {
        media.play().catch(() => {
          // Autoplay restrictions or interrupted loading must not break the feed.
        });
      } else {
        media.pause();
      }
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      media.pause();
    };
  }, [inViewport, paused, loaded, loadId]);

  return { videoRef, shouldLoad: loaded, loadId };
}
