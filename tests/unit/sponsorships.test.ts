import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api-error";
import {
  parseSponsorshipFields,
  peakConcurrency,
  validateSponsorIcon,
} from "@/lib/services/sponsorship-validation";
import { sponsorshipEndsAt, withSponsorUtm } from "@/lib/sponsorships";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const span = (start: string, end: string) => ({
  startsAt: day(start),
  endsAt: day(end),
});

describe("sponsorshipEndsAt", () => {
  test("runs one calendar month", () => {
    expect(sponsorshipEndsAt(day("2026-11-08")).toISOString()).toBe(
      "2026-12-08T00:00:00.000Z",
    );
  });

  test("clamps to the end of a shorter month", () => {
    expect(sponsorshipEndsAt(day("2027-01-31")).toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
  });
});

describe("peakConcurrency", () => {
  const window = span("2026-12-01", "2027-01-01");

  test("ignores bookings outside the window, including touching ones", () => {
    expect(
      peakConcurrency(window, [
        span("2026-11-01", "2026-12-01"),
        span("2027-01-01", "2027-02-01"),
      ]),
    ).toBe(0);
  });

  test("counts only bookings live at the same instant", () => {
    // Two overlap the window but never each other.
    expect(
      peakConcurrency(window, [
        span("2026-11-10", "2026-12-05"),
        span("2026-12-20", "2027-01-20"),
      ]),
    ).toBe(1);
  });

  test("finds a peak that starts inside the window", () => {
    expect(
      peakConcurrency(window, [
        span("2026-11-20", "2026-12-25"),
        span("2026-12-10", "2027-01-10"),
        span("2026-12-15", "2027-01-15"),
      ]),
    ).toBe(3);
  });
});

test("sponsor links carry Eizoki attribution", () => {
  const url = new URL(withSponsorUtm("https://example.com/launch?ref=x"));
  expect(url.searchParams.get("ref")).toBe("x");
  expect(url.searchParams.get("utm_source")).toBe("eizoki.com");
  expect(url.searchParams.get("utm_medium")).toBe("sponsorship");
});

describe("parseSponsorshipFields", () => {
  const form = (overrides: Record<string, string> = {}) => {
    const data = new FormData();
    const fields = {
      placement: "NAVBAR",
      productName: " DaemonDoc ",
      websiteUrl: "https://daemondoc.online",
      contactEmail: "hello@example.com",
      description: "Docs that write themselves.",
      ...overrides,
    };
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };

  test("accepts a complete booking and trims text", () => {
    expect(parseSponsorshipFields(form()).productName).toBe("DaemonDoc");
  });

  test("rejects insecure or credentialed links", () => {
    for (const websiteUrl of [
      "http://example.com",
      "https://user:pass@example.com",
      "javascript:alert(1)",
    ]) {
      expect(() => parseSponsorshipFields(form({ websiteUrl }))).toThrow(
        ApiError,
      );
    }
  });

  test("rejects unknown placements and fields", () => {
    expect(() => parseSponsorshipFields(form({ placement: "HERO" }))).toThrow(
      ApiError,
    );
    expect(() => parseSponsorshipFields(form({ status: "APPROVED" }))).toThrow(
      ApiError,
    );
  });
});

describe("validateSponsorIcon", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  test("is optional", async () => {
    expect(await validateSponsorIcon(null)).toBeNull();
  });

  test("accepts bytes that match the declared type", async () => {
    const icon = await validateSponsorIcon(
      new File([png], "icon.png", { type: "image/png" }),
    );
    expect(icon?.extension).toBe("png");
  });

  test("rejects a file whose bytes do not match", async () => {
    await expect(
      validateSponsorIcon(new File([png], "icon.webp", { type: "image/webp" })),
    ).rejects.toThrow("do not match");
  });

  test("rejects unsupported types", async () => {
    await expect(
      validateSponsorIcon(new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow(ApiError);
  });
});
