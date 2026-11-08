"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Prefetch nearby media, but play only while it is actually on screen. */
export function useViewportVideo(
  containerRef: RefObject<HTMLElement | null>,
  paused = false,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => {
        setShouldLoad(true);
        setInViewport(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    const prefetch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        prefetch.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    const visibility = new IntersectionObserver(([entry]) => {
      setInViewport(entry.isIntersecting && entry.intersectionRatio > 0);
    });
    prefetch.observe(container);
    visibility.observe(container);
    return () => {
      prefetch.disconnect();
      visibility.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const media = element;
    function syncPlayback() {
      if (inViewport && !paused && document.visibilityState !== "hidden") {
        media.play().catch(() => {
          // Autoplay restrictions or interrupted loading must not break the feed.
        });
      } else {
        media.pause();
      }
    }
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      media.pause();
    };
  }, [inViewport, paused, shouldLoad]);

  return { videoRef, shouldLoad };
}
