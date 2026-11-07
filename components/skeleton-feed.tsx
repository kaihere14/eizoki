const SKELETON_CARDS = [
  { ratio: "4 / 5" },
  { ratio: "16 / 10" },
  { ratio: "1 / 1" },
  { ratio: "3 / 4" },
  { ratio: "4 / 3" },
  { ratio: "5 / 6" },
  { ratio: "16 / 11" },
  { ratio: "4 / 5" },
  { ratio: "1 / 1" },
  { ratio: "3 / 4" },
  { ratio: "16 / 10" },
  { ratio: "5 / 6" },
] as const;

export function SkeletonFeed() {
  return (
    <div
      aria-hidden="true"
      className="columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4"
    >
      {SKELETON_CARDS.map((card, index) => (
        <div key={index} className="mb-3 sm:mb-4 break-inside-avoid">
          <div className="rounded-xl border border-zinc-200/70 bg-white p-1.5 shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
            {/* Video thumbnail placeholder */}
            <div
              className="skeleton-shimmer w-full rounded-lg"
              style={{ aspectRatio: card.ratio }}
            />

            {/* Title + creator meta placeholder */}
            <div className="px-1.5 pt-2.5 pb-1.5">
              <div className="skeleton-shimmer h-2.5 w-3/4 rounded-full" />
              <div className="mt-2 flex items-center gap-2">
                <div className="skeleton-shimmer h-4 w-4 shrink-0 rounded-full" />
                <div className="skeleton-shimmer h-2 w-1/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
