import { expect, test } from "bun:test";
import { sponsorWebsiteOrigin } from "@/lib/sponsor-website";

test("favicon lookups use only the website origin", () => {
  expect(
    sponsorWebsiteOrigin("https://example.com/product?token=private#plans"),
  ).toBe("https://example.com");
});

test("accepts a pasted domain without a scheme", () => {
  expect(sponsorWebsiteOrigin("  example.com/product  ")).toBe(
    "https://example.com",
  );
});

test("ignores incomplete links, credentials and unsupported protocols", () => {
  for (const input of [
    "",
    "example",
    "https://",
    "https://user:password@example.com",
    "http://example.com",
    "file:///tmp/icon",
    "javascript:alert(1)",
  ]) {
    expect(sponsorWebsiteOrigin(input)).toBeNull();
  }
});
