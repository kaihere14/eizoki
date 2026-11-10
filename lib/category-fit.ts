/** Gap between pills, matching the category bar's `gap-2`. */
export const CATEGORY_GAP = 8;

/** Pixel sizes read from the rendered category bar. */
export type CategoryMetrics = {
  /** Width of each pill, "All" first. */
  widths: number[];
  /** Width of the "Show more" control. */
  more: number;
  /** Room on the row. */
  available: number;
};

/**
 * Which items fit on one line, as indexes in their original order. When some
 * do not fit, a "Show more" control takes the last slot. "All" (index 0) and
 * the active item always stay visible, so the selection is never hidden in the
 * menu; the rest fill the remaining room in order.
 */
export function fitCategories(
  { widths, more, available }: CategoryMetrics,
  activeIndex: number,
): number[] {
  const total = widths.reduce((sum, width) => sum + width + CATEGORY_GAP, -CATEGORY_GAP);
  if (total <= available + 0.5) return widths.map((_, index) => index);

  const pinned = new Set([0, Math.max(0, activeIndex)]);
  // Every visible item is followed by a gap, then the "Show more" control.
  let room = available - more;
  for (const index of pinned) room -= widths[index] + CATEGORY_GAP;

  const visible = [...pinned];
  for (let index = 0; index < widths.length; index += 1) {
    if (pinned.has(index)) continue;
    const cost = widths[index] + CATEGORY_GAP;
    if (cost > room + 0.5) break;
    visible.push(index);
    room -= cost;
  }
  return visible.sort((a, b) => a - b);
}
