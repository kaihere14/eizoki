"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { CATEGORY_LABELS, type VideoCategory } from "@/lib/videos";
import { fitCategories, type CategoryMetrics } from "@/lib/category-fit";

type PillRect = { x: number; y: number; width: number; height: number };
type Item = { key: string; label: string; category?: VideoCategory };
const ALL_KEY = "all";
const SPRING = { type: "spring", stiffness: 430, damping: 32, mass: 0.7 } as const;

const PILL_CLASS =
  "relative inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[12.5px] font-medium whitespace-nowrap";
const MORE_CLASS = `${PILL_CLASS} gap-1 pr-3`;
/** The raised white pill behind every unselected control. */
const RAISED_SURFACE =
  "absolute inset-0 rounded-full border border-white bg-[linear-gradient(180deg,var(--raised-top)_0%,var(--raised-mid)_60%,var(--raised-bottom)_100%)] shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.05),0_1px_1px_rgba(9,9,11,0.05),0_3px_8px_-3px_rgba(9,9,11,0.10)]";

export function CategoryBar({
  categories,
  active,
  onChange,
}: {
  categories: VideoCategory[];
  active?: VideoCategory;
  onChange: (category: VideoCategory | undefined) => void;
}) {
  const items = useMemo<Item[]>(
    () => [
      { key: ALL_KEY, label: "All" },
      ...categories.map((category) => ({
        key: category,
        label: CATEGORY_LABELS[category],
        category,
      })),
    ],
    [categories],
  );
  const activeKey = active ?? ALL_KEY;
  const activeIndex = items.findIndex((item) => item.key === activeKey);

  const [metrics, setMetrics] = useState<CategoryMetrics | null>(null);
  const [pillRect, setPillRect] = useState<PillRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const availableRef = useRef<number | null>(null);
  const menuId = useId();
  const reduceMotion = useReducedMotion();

  // Until the first measurement (and during server rendering) every item is
  // rendered; the row clips, so nothing wraps or scrolls the page.
  const visibleIndexes = useMemo(
    () =>
      metrics
        ? fitCategories(metrics, activeIndex)
        : items.map((_, index) => index),
    [metrics, activeIndex, items],
  );
  const visible = visibleIndexes.map((index) => items[index]);
  const hidden = items.filter((_, index) => !visibleIndexes.includes(index));
  const showMore = hidden.length > 0;

  // Measure every label off-screen at its real size, plus the room on the row.
  const remeasure = useCallback(() => {
    const row = rowRef.current;
    const measurer = measureRef.current;
    if (!row || !measurer) return;

    const sizes = Array.from(
      measurer.children,
      (child) => child.getBoundingClientRect().width,
    );
    const style = getComputedStyle(row);
    const available =
      row.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);

    // The items move between the row and the menu on resize; start over.
    if (available !== availableRef.current) setMenuOpen(false);
    availableRef.current = available;
    setMetrics({ widths: sizes.slice(0, -1), more: sizes.at(-1) ?? 0, available });
  }, []);

  // Re-fit when the viewport resizes, the labels change, or fonts load.
  useLayoutEffect(() => {
    remeasure();
    const observer = new ResizeObserver(remeasure);
    if (rowRef.current) observer.observe(rowRef.current);
    if (measureRef.current) observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, [items, remeasure]);

  const measurePill = useCallback(() => {
    const track = trackRef.current;
    const element = buttonRefs.current[activeKey];
    if (!track || !element) return;

    const trackRect = track.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    setPillRect({
      x: rect.left - trackRect.left,
      y: rect.top - trackRect.top,
      width: rect.width,
      height: rect.height,
    });
  }, [activeKey]);

  // The visible set decides where the active button sits, so follow it too.
  const visibleKey = visibleIndexes.join(",");
  useLayoutEffect(() => {
    measurePill();
  }, [measurePill, visibleKey]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measurePill);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measurePill]);

  // Close on any press outside the control and its menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        moreRef.current?.contains(target)
      )
        return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  // Move focus into the menu when it opens so arrow keys work straight away.
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
  }, [menuOpen]);

  function select(item: Item) {
    setMenuOpen(false);
    onChange(item.category);
  }

  function closeMenu() {
    setMenuOpen(false);
    moreRef.current?.focus({ preventScroll: true });
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const options = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
        [],
    );
    const current = options.indexOf(document.activeElement as HTMLElement);
    const focusAt = (index: number) =>
      options[(index + options.length) % options.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(options.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "Tab":
        setMenuOpen(false);
        break;
    }
  }

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

      {/* Clipped sideways only, so the menu can still drop below the row. */}
      <div
        ref={rowRef}
        className="relative overflow-x-clip px-4 pt-1 pb-3 sm:px-3"
      >
        {/* Off-screen copies at their natural width, used only for fitting. */}
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 flex w-max gap-2"
        >
          {items.map((item) => (
            <span key={item.key} className={PILL_CLASS}>
              {item.label}
            </span>
          ))}
          <span className={MORE_CLASS}>
            Show more
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>

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
              animate={pillRect}
              transition={{ x: SPRING, y: SPRING, width: SPRING, height: SPRING }}
              className="absolute top-0 left-0 z-0 rounded-full border border-white/25 bg-[linear-gradient(180deg,var(--brand-400)_0%,var(--brand-500)_55%,var(--brand-600)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.18),0_1px_2px_var(--brand-shadow),0_4px_10px_-3px_var(--brand-shadow-strong)]"
            />
          )}

          {visible.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <button
                key={item.key}
                ref={(element) => {
                  buttonRefs.current[item.key] = element;
                }}
                type="button"
                aria-pressed={isActive}
                onClick={() => select(item)}
                className={`group z-10 cursor-pointer ${PILL_CLASS}`}
              >
                {/* Inactive white depth pill fades out while the blue pill slides in */}
                <span
                  aria-hidden="true"
                  className={`${RAISED_SURFACE} transition-opacity duration-200 ${
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
                  {item.label}
                </span>
              </button>
            );
          })}

          {showMore && (
            <div className="relative z-10 shrink-0">
              <button
                ref={moreRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onClick={() => setMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && !menuOpen) {
                    event.preventDefault();
                    setMenuOpen(true);
                  }
                }}
                className={`group cursor-pointer active:scale-[0.97] transition-transform duration-150 ${MORE_CLASS}`}
              >
                <span aria-hidden="true" className={RAISED_SURFACE} />
                <span className="relative text-zinc-600 transition-colors duration-200 group-hover:text-zinc-900">
                  Show more
                </span>
                <ChevronDown
                  aria-hidden="true"
                  strokeWidth={2}
                  className={`relative h-3.5 w-3.5 text-zinc-400 transition-[transform,color] duration-200 group-hover:text-zinc-700 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="More categories"
                    onKeyDown={onMenuKeyDown}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -4, scale: 0.97 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -2, scale: 0.98 }
                    }
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    style={{ transformOrigin: "top right" }}
                    className="absolute top-full right-0 z-50 mt-2 max-h-[min(60vh,320px)] w-max min-w-44 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(9,9,11,0.12)]"
                  >
                    {hidden.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => select(item)}
                        className="flex w-full cursor-pointer items-center rounded-[10px] px-3 py-2 text-left text-[12.5px] font-medium text-zinc-600 outline-none transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:bg-zinc-100 focus-visible:text-zinc-900"
                      >
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Holds the bar's place while the categories stream in. */
export function CategoryBarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="-mx-4 mb-3 overflow-x-clip px-4 pt-1 pb-3 sm:-mx-3 sm:mb-4 sm:px-3"
    >
      <div className="flex gap-2">
        {[44, 76, 104, 92, 120, 84].map((width) => (
          <span
            key={width}
            style={{ width }}
            className="skeleton-shimmer h-8 shrink-0 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
