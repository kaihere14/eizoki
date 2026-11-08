/** Client-safe sponsorship rules shared by the booking form, API and admin. */

export type SponsorshipPlacement = "NAVBAR" | "FEED_VIDEO";

/** How many bookings of each placement may be live at the same moment. */
export const SPONSOR_CAPACITY: Record<SponsorshipPlacement, number> = {
  NAVBAR: 3,
  FEED_VIDEO: 1,
};

export const SPONSORSHIP_LABELS: Record<SponsorshipPlacement, string> = {
  NAVBAR: "Navbar sponsor",
  FEED_VIDEO: "Featured video",
};

/** Zero-based position of the sponsored card in the first page of the feed. */
export const FEED_SPONSOR_POSITION = 3;

export const MAX_SPONSOR_ICON_BYTES = 2_000_000;
export const SPONSOR_ICON_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export interface PublicSponsor {
  id: string;
  productName: string;
  /** Destination with Eizoki attribution already appended. */
  href: string;
  iconUrl: string | null;
  description: string | null;
}

export interface PublicFeedSponsor extends PublicSponsor {
  videoUrl: string;
}

/** Every booking runs for one calendar month from its start. */
export function sponsorshipEndsAt(startsAt: Date) {
  const end = new Date(startsAt);
  const day = end.getUTCDate();
  end.setUTCMonth(end.getUTCMonth() + 1);
  // 31 January plus one month must stop at the end of February, not 3 March.
  if (end.getUTCDate() !== day) end.setUTCDate(0);
  return end;
}

const SPONSOR_UTM = {
  utm_source: "eizoki.com",
  utm_medium: "sponsorship",
  utm_campaign: "eizoki_sponsorship",
} as const;

/** Every sponsor link carries the same attribution so traffic is traceable. */
export function withSponsorUtm(href: string) {
  const url = new URL(href);
  for (const [key, value] of Object.entries(SPONSOR_UTM)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
