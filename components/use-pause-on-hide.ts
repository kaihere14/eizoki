"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Pause a media element when its page is hidden.
 *
 * With Cache Components, Next.js keeps recently visited pages mounted inside
 * React's <Activity> and only hides them with `display: none`, which does not
 * stop playback. React runs layout-effect cleanups when Activity hides a
 * subtree, so pausing here stops a video the moment the user navigates away,
 * while keeping its position for the back button.
 *
 * Pass `elementKey` when the element is re-created (for example through a
 * React `key`), so the hook follows the current element.
 */
export function usePauseOnHide(
  ref: RefObject<HTMLMediaElement | null>,
  elementKey?: unknown,
) {
  useLayoutEffect(() => {
    const media = ref.current;
    return () => media?.pause();
  }, [ref, elementKey]);
}
