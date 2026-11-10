import { describe, expect, test } from "bun:test";
import { CATEGORY_GAP, fitCategories } from "@/lib/category-fit";

// "All" plus four categories, each 100px wide; "Show more" is 90px.
const widths = [40, 100, 100, 100, 100];
const more = 90;
const fullWidth = widths.reduce((sum, width) => sum + width, 0) + CATEGORY_GAP * 4;

describe("fitCategories", () => {
  test("shows everything, with no menu, when it all fits", () => {
    expect(fitCategories({ widths, more, available: fullWidth }, 0)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  test("fills the row in order and leaves room for Show more", () => {
    // All (48) + two categories (216) + Show more (90) = 354.
    expect(fitCategories({ widths, more, available: 360 }, 0)).toEqual([
      0, 1, 2,
    ]);
  });

  test("keeps the active category visible when it would overflow", () => {
    // All (48) + active (108) + one more (108) + Show more (90) = 354.
    expect(fitCategories({ widths, more, available: 360 }, 4)).toEqual([
      0, 1, 4,
    ]);
  });

  test("never hides All or the active category, even with no room", () => {
    expect(fitCategories({ widths, more, available: 120 }, 3)).toEqual([0, 3]);
  });

  test("stops at the first item that does not fit, keeping the order", () => {
    const uneven = [40, 200, 60, 60];
    // All (48) + Show more (90) leaves 102: the 200px item does not fit, and
    // the smaller ones after it do not jump ahead of it.
    expect(
      fitCategories({ widths: uneven, more, available: 240 }, 0),
    ).toEqual([0]);
  });
});
