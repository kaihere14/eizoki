"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";

// Roughly ten lines at the prompt's font size, including on narrow screens.
const COLLAPSED_HEIGHT = 200;

export function ExpandablePrompt({ text }: { text: string }) {
  const contentId = useId();
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const canExpand = contentHeight !== null && contentHeight > COLLAPSED_HEIGHT;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Observe the text rather than the animated wrapper, so wrapping, font
    // loading and viewport changes update the target without a resize loop.
    const observer = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div>
      <motion.div
        id={contentId}
        initial={false}
        animate={{
          maxHeight:
            expanded && contentHeight !== null
              ? contentHeight
              : COLLAPSED_HEIGHT,
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.25,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="relative overflow-hidden"
      >
        <p
          ref={contentRef}
          className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-zinc-600"
        >
          {text}
        </p>
        {canExpand && (
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{ opacity: expanded ? 0 : 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
          />
        )}
      </motion.div>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md text-[12px] font-medium text-brand outline-none transition-colors duration-150 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {expanded ? "See less" : "See more"}
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
