"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_VIDEO_TAGS, VIDEO_TAGS, type VideoTag } from "@/lib/video-tags";

export function TagPicker() {
  const [selected, setSelected] = useState<VideoTag[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const pickerId = useId();
  const atLimit = selected.length >= MAX_VIDEO_TAGS;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function addTag(tag: VideoTag) {
    if (selected.length >= MAX_VIDEO_TAGS || selected.includes(tag)) return;
    setSelected([...selected, tag]);
    addRef.current?.focus();
    if (selected.length + 1 >= MAX_VIDEO_TAGS) {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative border-t border-zinc-100 pt-5"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          addRef.current?.focus();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span id={labelId} className="text-[12px] font-medium text-zinc-700">
          Tags <span className="font-normal text-zinc-400">(optional)</span>
        </span>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-[11px] tabular-nums text-zinc-400"
        >
          {selected.length}/{MAX_VIDEO_TAGS}
        </span>
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-2.5 flex flex-wrap items-center gap-2"
      >
        {selected.map((value) => {
          const tag = VIDEO_TAGS.find((option) => option.value === value)!;
          return (
            <span
              key={value}
              className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-white bg-[linear-gradient(180deg,var(--raised-mid)_0%,var(--raised-sunken)_100%)] pl-3 pr-1 text-[12px] font-medium text-zinc-600 shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.05),0_1px_1px_rgba(9,9,11,0.05),0_3px_8px_-3px_rgba(9,9,11,0.10)]"
            >
              <input type="hidden" name="tags" value={value} />
              <span className="truncate">{tag.label}</span>
              <button
                type="button"
                aria-label={`Remove ${tag.label} tag`}
                onClick={() => {
                  setSelected(selected.filter((item) => item !== value));
                  addRef.current?.focus();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors duration-150 hover:bg-zinc-200/60 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand motion-safe:enabled:active:scale-[0.96]"
              >
                <X className="h-3 w-3" strokeWidth={1.7} />
              </button>
            </span>
          );
        })}
        <button
          ref={addRef}
          type="button"
          aria-expanded={open}
          aria-controls={pickerId}
          aria-disabled={atLimit}
          onClick={() => {
            if (!atLimit) setOpen(!open);
          }}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white/70 px-3 text-[12px] font-medium text-zinc-500 outline-none transition-[background-color,border-color,color,transform] duration-150 hover:border-brand/60 hover:bg-brand-50 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand aria-disabled:cursor-not-allowed aria-disabled:text-zinc-400 motion-safe:enabled:aria-[disabled=false]:active:scale-[0.96]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.7} /> Add tag
        </button>
      </div>
      {open && (
        <div
          id={pickerId}
          role="group"
          aria-label="Available tags"
          className="absolute inset-x-0 top-full z-20 mt-2 rounded-[14px] border border-zinc-200/90 bg-white p-2 shadow-[0_8px_30px_-10px_rgba(9,9,11,0.18),0_2px_6px_rgba(9,9,11,0.04)]"
        >
          <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto overscroll-contain p-1">
            {VIDEO_TAGS.filter((tag) => !selected.includes(tag.value)).map(
              (tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => addTag(tag.value)}
                  className="rounded-full border border-transparent px-2.5 py-2 text-[12px] text-zinc-600 outline-none transition-colors duration-150 hover:border-brand/10 hover:bg-brand-50 hover:text-brand focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {tag.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
