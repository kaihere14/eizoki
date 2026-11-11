"use client";

import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Heart } from "lucide-react";
import { useLoginModal } from "@/components/login-modal";
import { fetchFavouriteStatus, setVideoFavourite } from "@/lib/favourites";

const BURST_PARTICLES = [
  { x: -11, y: -10, size: 3 },
  { x: 0, y: -14, size: 2 },
  { x: 11, y: -10, size: 3 },
  { x: -14, y: 1, size: 2 },
  { x: 14, y: 1, size: 2 },
  { x: -9, y: 12, size: 3 },
  { x: 9, y: 12, size: 2 },
] as const;

/** A short, playful burst when the heart is filled. */
function HeartBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2"
    >
      <motion.span
        className="absolute h-6 w-6 rounded-full border border-brand/50"
        initial={{ scale: 0.4, opacity: 0.8, x: "-50%", y: "-50%" }}
        animate={{ scale: 1.5, opacity: 0, x: "-50%", y: "-50%" }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      {BURST_PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-brand"
          style={{ width: particle.size, height: particle.size }}
          initial={{ x: -particle.size / 2, y: -particle.size / 2, opacity: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
            delay: index * 0.01,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Reads and writes the signed-in user's bookmark for one video. The server owns
 * the unique (user, video) pair, so this control only mirrors that state.
 */
export function FavouriteButton(props: FavouriteButtonProps) {
  const { userId } = useAuth();
  return <FavouriteButtonState key={`${userId ?? "guest"}:${props.videoId}`} {...props} />;
}

type FavouriteButtonProps = {
  videoId: string;
  videoTitle: string;
  initialFavourited?: boolean;
  compact?: boolean;
  variant?: "default" | "overlay";
  onChange?: (favourited: boolean) => void;
  onSaveComplete?: () => void;
};

function FavouriteButtonState({
  videoId,
  videoTitle,
  initialFavourited,
  compact = false,
  variant = "default",
  onChange,
  onSaveComplete,
}: FavouriteButtonProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { openLoginModal } = useLoginModal();
  const shouldReduceMotion = useReducedMotion();
  const [favourited, setFavourited] = useState(initialFavourited ?? false);
  const [checked, setChecked] = useState(initialFavourited !== undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);
  const statusController = useRef<AbortController | null>(null);

  useEffect(() => {
    // A signed-out visitor has nothing saved; the click handler asks them in.
    if (!isLoaded || !isSignedIn) return;

    const controller = new AbortController();
    statusController.current = controller;
    fetchFavouriteStatus(videoId, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setFavourited(value);
        setChecked(true);
      })
      .catch(() => {
        // Keep the initial state when the check fails; the button can still toggle.
        if (!controller.signal.aborted) setChecked(true);
      });

    return () => controller.abort();
  }, [isLoaded, isSignedIn, videoId]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ videoId: string; userId: string; favourited: boolean }>).detail;
      if (detail?.videoId !== videoId || detail.userId !== userId) return;
      // A status request started before this mutation must not overwrite it.
      statusController.current?.abort();
      setFavourited(detail.favourited);
      setChecked(true);
    };
    window.addEventListener("eizoki:favourites-changed", sync);
    return () => window.removeEventListener("eizoki:favourites-changed", sync);
  }, [videoId, userId]);

  const saved = isSignedIn === true ? favourited : false;
  const known = isLoaded && (!isSignedIn || checked);

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (!isLoaded) return;
    if (!isSignedIn) {
      openLoginModal();
      return;
    }
    if (busy) return;

    const next = !saved;
    const startedAt = performance.now();
    const animateSave = event.detail > 0 && !shouldReduceMotion;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    statusController.current?.abort();
    setBusy(true);
    setError(null);
    setFavourited(next);
    if (next) setBurst((value) => value + 1);

    try {
      const persisted = await setVideoFavourite(videoId, next);
      posthog.capture(persisted ? "favourite_added" : "favourite_removed", {
        video_id: videoId,
        display_variant: compact ? variant : "default",
      });
      setFavourited(persisted);
      onChange?.(persisted);
      if (mounted.current && next && persisted && animateSave && onSaveComplete) {
        // The burst's last particle finishes at 560ms; never fly before persistence.
        saveTimer.current = setTimeout(onSaveComplete, Math.max(0, 580 - (performance.now() - startedAt)));
      }
      window.dispatchEvent(new CustomEvent("eizoki:favourites-changed", {
        detail: { videoId, userId, favourited: persisted },
      }));
    } catch (cause) {
      setFavourited(!next);
      setError(
        cause instanceof Error
          ? cause.message
          : "Your favourites could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  const action = saved ? "Remove from favourites" : "Add to favourites";
  const heart = (
    <motion.span
      key={saved ? "saved" : "unsaved"}
      className="flex"
      initial={shouldReduceMotion || !saved ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 14, mass: 0.6 }}
    >
      <Heart
        className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
        strokeWidth={1.9}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </motion.span>
  );

  if (compact) {
    const overlay = variant === "overlay";

    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !known}
        aria-label={`${action}: ${videoTitle}`}
        aria-pressed={saved}
        title={error ?? action}
        className={`relative flex shrink-0 items-center justify-center rounded-full outline-none transition-[background-color,color,transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait ${
          overlay
            ? `card-action ${
                saved ? "text-brand" : "text-zinc-800"
              }`
            : `h-7 w-7 border ${
                saved
                  ? "border-brand/25 bg-brand/5 text-brand hover:bg-brand/10"
                  : "border-zinc-200/80 bg-white text-zinc-400 hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
              }`
        }`}
      >
        {overlay && saved && burst > 0 && !shouldReduceMotion && <HeartBurst key={burst} />}
        {heart}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !known}
        aria-pressed={saved}
        className={`flex w-full items-center justify-between rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(9,9,11,0.04)] outline-none transition-[background-color,border-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:active:scale-[0.99] disabled:cursor-wait ${
          saved
            ? "border-brand/25 bg-brand/5 text-brand hover:bg-brand/10"
            : "border-zinc-200/60 bg-white text-zinc-700 hover:text-zinc-950"
        }`}
      >
        <span>{saved ? "Saved to favourites" : "Add to favourites"}</span>
        {heart}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
