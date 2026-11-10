import { describe, expect, test } from "bun:test";
import { videoSearchQuerySchema } from "@/lib/services/video-search";

describe("videoSearchQuerySchema", () => {
  test("trims, collapses spaces and lower-cases the query", () => {
    expect(videoSearchQuerySchema.parse({ q: "  Kinetic   TYPO " })).toEqual({
      q: "kinetic typo",
      limit: 12,
    });
  });

  test("rejects queries too short to match usefully", () => {
    expect(videoSearchQuerySchema.safeParse({ q: " a " }).success).toBe(false);
  });

  test("caps the query length and result count", () => {
    expect(
      videoSearchQuerySchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      videoSearchQuerySchema.safeParse({ q: "neon", limit: "100" }).success,
    ).toBe(false);
  });
});
