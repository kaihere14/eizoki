"use client";

import { motion, useReducedMotion } from "motion/react";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-10 sm:pt-12 pb-7 sm:pb-9 text-center">
      <h1 className="font-display text-[16px] leading-[1.25] sm:text-[18px] md:text-[20px] font-semibold tracking-[-0.01em] text-zinc-900">
        Eizoki is a{" "}
        <span className="relative inline-block px-2 py-1 leading-none">
          curated catalogue
          {/* Inspect-style selection box that draws in from top-left to bottom-right */}
          <motion.span
            aria-hidden="true"
            style={{ transformOrigin: "top left" }}
            initial={shouldReduceMotion ? { opacity: 0 } : { scaleX: 0, scaleY: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { scaleX: 1, scaleY: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : {
                    type: "spring",
                    stiffness: 140,
                    damping: 18,
                    mass: 0.9,
                    delay: 0.15,
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
        <br />
        for AI motion worth watching.
      </h1>
      <p className="mx-auto mt-3.5 max-w-xl text-[14px] sm:text-[14.5px] leading-[1.6] text-zinc-500 text-balance">
        AI films, motion design, launch videos and creative experiments, each
        reviewed by hand. Below, the latest visual work picked from across the
        web.
      </p>
    </section>
  );
}
