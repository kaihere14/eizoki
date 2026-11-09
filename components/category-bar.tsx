"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";

const CATEGORIES = [
  "All",
  "AI Motion",
  "Launch Videos",
  "3D & Experiments",
  "UI Motion",
  "Kinetic Typography",
  "Cinematic & Visual Stories",
  "Creative Experiments",
] as const;

type PillRect = { x: number; y: number; width: number; height: number };

export function CategoryBar() {
  const [active, setActive] = useState<string>("All");
  const [pillRect, setPillRect] = useState<PillRect | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const measure = useCallback((category: string) => {
    const track = trackRef.current;
    const el = buttonRefs.current[category];
    if (!track || !el) return;

    const trackRect = track.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    setPillRect({
      x: rect.left - trackRect.left,
      y: rect.top - trackRect.top,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useLayoutEffect(() => {
    measure(active);
  }, [active, measure]);

  // Keep the pill aligned when fonts load, the window resizes, or labels reflow.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(() => measure(active));
    observer.observe(track);

    return () => observer.disconnect();
  }, [active, measure]);

  return (
    <div className="sticky top-15 z-40 -mx-4 mb-3 sm:top-16 sm:-mx-3 sm:mb-4">
      {/* Progressive blur: strongest under the navbar, easing to none at the
          bottom of the bar. Full-bleed, and reaching up to the navbar's edge
          so content never shows sharp in the gap. See globals.css. */}
      <div
        aria-hidden="true"
        className="progressive-blur pointer-events-none absolute -top-[7px] bottom-0 left-1/2 w-screen -translate-x-1/2 sm:-top-[11px]"
      >
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
      <div className="relative overflow-x-auto px-4 pt-1 pb-3 sm:px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          ref={trackRef}
          role="group"
          aria-label="Browse by category"
          className="relative inline-flex items-center gap-2"
        >
          {/* Single active pill that slides between categories */}
          {pillRect && (
            <motion.div
              aria-hidden="true"
              initial={false}
              animate={{
                x: pillRect.x,
                y: pillRect.y,
                width: pillRect.width,
                height: pillRect.height,
              }}
              transition={{
                x: { type: "spring", stiffness: 430, damping: 32, mass: 0.7 },
                y: { type: "spring", stiffness: 430, damping: 32, mass: 0.7 },
                width: {
                  type: "spring",
                  stiffness: 430,
                  damping: 32,
                  mass: 0.7,
                },
                height: {
                  type: "spring",
                  stiffness: 430,
                  damping: 32,
                  mass: 0.7,
                },
              }}
              className="absolute top-0 left-0 z-0 rounded-full border border-white/25 bg-[linear-gradient(180deg,var(--brand-400)_0%,var(--brand-500)_55%,var(--brand-600)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.18),0_1px_2px_var(--brand-shadow),0_4px_10px_-3px_var(--brand-shadow-strong)]"
            />
          )}

          {CATEGORIES.map((category) => {
            const isActive = category === active;

            return (
              <button
                key={category}
                ref={(el) => {
                  buttonRefs.current[category] = el;
                }}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(category)}
                className="group relative z-10 shrink-0 inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-medium whitespace-nowrap cursor-pointer"
              >
                {/* Inactive white depth pill fades out while the blue pill slides in */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-full border border-white bg-[linear-gradient(180deg,var(--raised-top)_0%,var(--raised-mid)_60%,var(--raised-bottom)_100%)] shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.05),0_1px_1px_rgba(9,9,11,0.05),0_3px_8px_-3px_rgba(9,9,11,0.10)] transition-opacity duration-200 ${
                    isActive ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`relative transition-colors duration-200 ${
                    isActive
                      ? "text-on-brand"
                      : "text-zinc-600 group-hover:text-zinc-900"
                  }`}
                >
                  {category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
