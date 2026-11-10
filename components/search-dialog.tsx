"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Film, LoaderCircle, Search, X } from "lucide-react";
import {
  motion,
  useIsPresent,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { VideoPreview } from "@/components/video-preview";
import { fetchVideoSearch, MIN_SEARCH_LENGTH } from "@/lib/video-search";
import {
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  type VideoMetadata,
} from "@/lib/videos";

/** Waits for a pause in typing so each keystroke does not cost a request. */
const DEBOUNCE_MS = 160;

type SearchResult = { query: string; videos: VideoMetadata[]; error?: string };

/** Which navbar control opened search: the centre pill or the phone icon. */
export type SearchOrigin = "pill" | "icon";

/** Where the trigger sits on screen, in viewport pixels. */
export type SearchOriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The pill's raised white face, repeated on the panel while it is pill-sized. */
const PILL_FACE =
  "bg-[linear-gradient(180deg,var(--raised-top)_0%,var(--raised-mid)_52%,var(--raised-bottom)_100%)]";

/** Settles quickly with a hint of give; closing has none, so it lands exactly. */
const OPEN: Transition = { type: "spring", duration: 0.5, bounce: 0.14 };
const CLOSE: Transition = { type: "spring", duration: 0.36, bounce: 0 };

/** The open panel: centred, at most 576px wide, a little below the navbar. */
function panelFrame() {
  const viewport = document.documentElement.clientWidth;
  const width = Math.min(576, viewport - 32);
  return {
    x: Math.round((viewport - width) / 2),
    y: Math.round(Math.max(64, window.innerHeight * 0.12)),
    width,
  };
}

/**
 * Search, then preview. The query and results live here, and the panel stays
 * mounted under the preview, so closing a preview returns to the same list.
 *
 * The panel grows out of the trigger at `originRect` and shrinks back into it.
 * Render inside <AnimatePresence custom={latest trigger rect}> and hide the
 * trigger until the exit completes, so the panel lands where the trigger was.
 */
export function SearchDialog({
  origin,
  originRect,
  onClose,
}: {
  origin: SearchOrigin;
  originRect: SearchOriginRect | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selected, setSelected] = useState<VideoMetadata | null>(null);

  const term = query.trim().replace(/\s+/g, " ");
  const searchable = term.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchVideoSearch(term, { signal: controller.signal })
        .then((videos) => setResult({ query: term, videos }))
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setResult({
            query: term,
            videos: [],
            error:
              cause instanceof Error
                ? cause.message
                : "Search is unavailable right now. Please try again.",
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, searchable, retryToken]);

  // Earlier results stay on screen (dimmed) until the new ones arrive.
  const loading = searchable && result?.query !== term;
  const videos = searchable ? (result?.videos ?? []) : [];
  const error = searchable && !loading ? result?.error : undefined;

  return (
    <>
      <SearchPanel
        origin={origin}
        originRect={originRect}
        previewOpen={selected !== null}
        query={query}
        onQueryChange={setQuery}
        term={term}
        searchable={searchable}
        loading={loading}
        videos={videos}
        error={error}
        onRetry={() => setRetryToken((token) => token + 1)}
        onSelect={setSelected}
        onClose={onClose}
      />
      {selected && (
        <VideoPreview
          key={selected.id}
          video={selected}
          similar={videos}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function SearchPanel({
  origin,
  originRect,
  previewOpen,
  query,
  onQueryChange,
  term,
  searchable,
  loading,
  videos,
  error,
  onRetry,
  onSelect,
  onClose,
}: {
  origin: SearchOrigin;
  originRect: SearchOriginRect | null;
  /** A video preview sits on top and owns the keyboard. */
  previewOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  term: string;
  searchable: boolean;
  loading: boolean;
  videos: VideoMetadata[];
  error?: string;
  onRetry: () => void;
  onSelect: (video: VideoMetadata) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, Math.max(videos.length - 1, 0));

  const reduceMotion = useReducedMotion() ?? false;
  // False while the panel shrinks back into the trigger after closing.
  const isPresent = useIsPresent();
  const [frame, setFrame] = useState(panelFrame);

  useEffect(() => {
    const onResize = () => setFrame(panelFrame());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // One real surface moves and resizes (no scaling), so borders, corners,
  // shadow and text stay crisp the whole way. `custom` is the trigger's rect;
  // AnimatePresence supplies a fresh one on close.
  const panelVariants: Variants = {
    collapsed: (rect: SearchOriginRect | null | undefined) =>
      rect && !reduceMotion
        ? {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.height / 2,
            opacity: 1,
            transition: CLOSE,
          }
        : {
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: "auto",
            borderRadius: 22,
            opacity: 0,
            transition: { duration: 0.15 },
          },
    expanded: {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: "auto",
      borderRadius: 22,
      opacity: 1,
      transition: reduceMotion ? { duration: 0.15 } : OPEN,
    },
  };

  // The trigger's face shows while the panel is trigger-sized, then gives way
  // to the input. Closing reverses it, so the panel lands looking like the pill.
  const faceVariants: Variants = {
    collapsed: { opacity: 1, transition: { delay: 0.14, duration: 0.18 } },
    expanded: { opacity: 0, transition: { duration: 0.12 } },
  };
  const contentVariants: Variants = {
    collapsed: { opacity: 0, transition: { duration: 0.1 } },
    expanded: { opacity: 1, transition: { delay: 0.12, duration: 0.2 } },
  };

  // Lock the page behind the panel until it has finished closing.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  // Escape closes search, unless a preview is open on top: that closes first.
  useEffect(() => {
    if (previewOpen || !isPresent) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen, isPresent, onClose]);

  // Keep Tab inside the panel, as a modal should.
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "input, button:not([disabled])",
      ) ?? [],
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Keep the highlighted row in view while moving with the arrow keys.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (videos.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((active + 1) % videos.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((active - 1 + videos.length) % videos.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSelect(videos[active]);
    }
  }

  const showList = searchable && videos.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search videos"
      onKeyDown={trapFocus}
      className={`fixed inset-0 z-[90] ${isPresent ? "" : "pointer-events-none"}`}
    >
      {/* No backdrop blur: blurring the playing feed every frame stutters. */}
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-zinc-950/25"
      />

      <motion.div
        ref={panelRef}
        custom={originRect}
        variants={panelVariants}
        initial="collapsed"
        animate="expanded"
        exit="collapsed"
        className="absolute top-0 left-0 overflow-hidden border border-zinc-200 bg-white text-zinc-900 shadow-[0_24px_60px_-18px_rgba(9,9,11,0.28)] will-change-transform"
      >
        {/* The trigger's own face, centred, fading out as the panel grows. */}
        {!reduceMotion && originRect && (
          <motion.div
            aria-hidden="true"
            variants={faceVariants}
            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1.5 ${
              origin === "pill" ? PILL_FACE : "bg-white"
            }`}
          >
            <Search
              className={
                origin === "pill"
                  ? "h-[15px] w-[15px] text-zinc-500"
                  : "h-4 w-4 text-zinc-500"
              }
              strokeWidth={origin === "pill" ? 1.7 : 1.8}
            />
            {origin === "pill" && (
              <span className="text-[14px] font-semibold tracking-tight text-zinc-600">
                Search
              </span>
            )}
          </motion.div>
        )}

        {/* Laid out at the final width from the start, so nothing reflows while
            the panel grows; the panel's overflow simply reveals it. */}
        <motion.div
          variants={contentVariants}
          style={{ width: frame.width - 2 }}
        >
          <div className="flex items-center gap-2.5 px-4">
            <span
              aria-hidden="true"
              className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-400"
            >
              {loading ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  strokeWidth={1.8}
                />
              ) : (
                <Search className="h-4 w-4" strokeWidth={1.8} />
              )}
            </span>
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search by title, creator, tag or tool"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                showList ? `${listId}-${active}` : undefined
              }
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search titles, creators, tags, tools…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={100}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 outline-none transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 cursor-pointer rounded-md border border-zinc-200 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-500 outline-none transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand sm:block"
            >
              Esc
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="-mr-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 outline-none transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand sm:hidden"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="border-t border-zinc-100">
            {showList ? (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="Matching videos"
                aria-busy={loading}
                className={`max-h-[min(60dvh,440px)] overflow-y-auto overscroll-contain p-1.5 transition-opacity duration-150 ${
                  loading ? "opacity-60" : "opacity-100"
                }`}
              >
                {videos.map((video, index) => (
                  <SearchRow
                    key={video.id}
                    id={`${listId}-${index}`}
                    index={index}
                    video={video}
                    active={index === active}
                    onHover={() => setActiveIndex(index)}
                    onSelect={() => onSelect(video)}
                  />
                ))}
              </ul>
            ) : (
              <SearchMessage
                term={term}
                searchable={searchable}
                loading={loading}
                error={error}
                onRetry={onRetry}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SearchRow({
  id,
  index,
  video,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  index: number;
  video: VideoMetadata;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const [posterFailed, setPosterFailed] = useState(false);
  const details = [video.creator.name, CATEGORY_LABELS[video.category]]
    .filter(Boolean)
    .join(" · ");

  return (
    // The input keeps focus and drives the active row (aria-activedescendant),
    // so rows are pointer targets only.
    <li
      id={id}
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseMove={active ? undefined : onHover}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-3 rounded-[14px] p-2 transition-colors duration-100 ${
        active ? "bg-zinc-100" : ""
      }`}
    >
      <span
        className={`relative h-11 w-14 shrink-0 overflow-hidden rounded-[8px] border border-zinc-200/70 bg-gradient-to-br ${CATEGORY_GRADIENTS[video.category] ?? "from-zinc-200 to-zinc-300"}`}
      >
        {video.posterUrl && !posterFailed ? (
          // Posters are already small WebP files; skip the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Film
            aria-hidden="true"
            className="absolute inset-0 m-auto h-4 w-4 text-white/80"
            strokeWidth={1.6}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-zinc-900">
          {video.title}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-zinc-500">
          {details}
        </span>
      </span>
    </li>
  );
}

function SearchMessage({
  term,
  searchable,
  loading,
  error,
  onRetry,
}: {
  term: string;
  searchable: boolean;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  let content: ReactNode;
  if (!searchable) {
    content = (
      <p className="text-[12.5px] leading-relaxed text-zinc-500">
        Search by title, creator, tag or tool. Typos and half-remembered names
        still find the video.
      </p>
    );
  } else if (loading) {
    content = <p className="text-[12.5px] text-zinc-500">Searching…</p>;
  } else if (error) {
    content = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="alert" className="text-[12.5px] text-red-600">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand"
        >
          Try again
        </button>
      </div>
    );
  } else {
    content = (
      <p className="text-[12.5px] text-zinc-500">
        Nothing matches{" "}
        <span className="font-medium text-zinc-800">“{term}”</span>. Try fewer
        words or another spelling.
      </p>
    );
  }

  return (
    <div role="status" className="px-4 py-5">
      {content}
    </div>
  );
}
