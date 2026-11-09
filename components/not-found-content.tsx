"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { VideoOff } from "lucide-react";

const primaryClass =
  "inline-flex items-center rounded-full border border-white/20 bg-brand px-4 py-2 text-[12.5px] font-medium text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_var(--brand-shadow)] outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-brand-600 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

const secondaryClass =
  "inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-700 shadow-sm outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand";

export function NotFoundContent() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  // Hovering the heading redraws the selection box, like inspecting it again.
  const [replay, setReplay] = useState(0);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-20">
      {/* An empty player: the frame the visitor came for, with nothing to play. */}
      <div
        aria-hidden="true"
        className="relative flex aspect-video w-full max-w-[300px] flex-col overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white/70"
      >
        <div className="flex flex-1 items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <VideoOff className="h-5 w-5" strokeWidth={1.5} />
          </span>
        </div>
        <div className="px-3.5 pb-3">
          <div className="h-[3px] rounded-full bg-zinc-200" />
          <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-zinc-400">
            <span>00:00</span>
            <span>04:04</span>
          </div>
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] text-zinc-400">Error 404</p>

      <motion.h1
        onHoverStart={() => {
          if (
            !shouldReduceMotion &&
            window.matchMedia("(hover: hover) and (pointer: fine)").matches
          )
            setReplay((value) => value + 1);
        }}
        className="mt-3 font-display text-[22px] leading-[1.3] font-semibold tracking-[-0.01em] text-zinc-900 text-balance sm:text-[26px]"
      >
        This page isn&rsquo;t in{" "}
        <span className="relative inline-block px-2 py-1 leading-none">
          the catalogue
          {/* Inspect-style selection box, the same one every page title uses. */}
          <motion.span
            key={replay}
            aria-hidden="true"
            style={{ transformOrigin: "top left" }}
            initial={
              shouldReduceMotion ? { opacity: 0 } : { scaleX: 0, scaleY: 0 }
            }
            animate={
              shouldReduceMotion ? { opacity: 1 } : { scaleX: 1, scaleY: 1 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : {
                    type: "spring",
                    stiffness: 140,
                    damping: 18,
                    mass: 0.9,
                    delay: replay === 0 ? 0.15 : 0,
                  }
            }
            className="pointer-events-none absolute inset-0 border border-brand"
          >
            <span className="absolute -top-[3px] -left-[3px] h-[5px] w-[5px] border border-brand bg-white" />
            <span className="absolute -top-[3px] -right-[3px] h-[5px] w-[5px] border border-brand bg-white" />
            <span className="absolute -bottom-[3px] -left-[3px] h-[5px] w-[5px] border border-brand bg-white" />
            <span className="absolute -bottom-[3px] -right-[3px] h-[5px] w-[5px] border border-brand bg-white" />
          </motion.span>
        </span>
      </motion.h1>

      <p className="mt-3.5 max-w-sm text-[14px] leading-[1.6] text-zinc-500 text-balance">
        The link may be broken, or the video was taken down. Everything
        that&rsquo;s been published lives on the home page.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <Link href="/" className={primaryClass}>
          Browse the catalogue
        </Link>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          className={secondaryClass}
        >
          Go back
        </button>
      </div>
    </main>
  );
}
