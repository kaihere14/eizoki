"use client";

import { useRef, type ComponentProps } from "react";
import { usePauseOnHide } from "@/components/use-pause-on-hide";

/** A plain <video> that stops playing when the user leaves its page. */
export function VideoPlayer(props: Omit<ComponentProps<"video">, "ref">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  usePauseOnHide(videoRef);
  return <video ref={videoRef} {...props} />;
}
