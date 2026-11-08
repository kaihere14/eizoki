import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { BlockList, isIP } from "node:net";
import path from "node:path";
import sharp from "sharp";

/** Icons are drawn at 28px; 128px covers retina screens with room to spare. */
const ICON_SIZE = 128;
const MAX_HTML_BYTES = 512_000;
const MAX_REMOTE_ICON_BYTES = 2_000_000;
/** A normalised 128px WebP is a few KB; anything larger is not inlined. */
const MAX_INLINE_BYTES = 48_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5_000;

const TRUSTED_ICON_HOSTS = new Set(["ik.imagekit.io"]);

/** Addresses a sponsor's website must never resolve to (SSRF guard). */
const PRIVATE_RANGES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  // No ::ffff:0:0/96 rule: BlockList matches it against every IPv4 address.
  // IPv4-mapped IPv6 addresses are unwrapped and checked as IPv4 instead.
  ["::", 127],
  ["64:ff9b::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv6");
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Icon URL must be plain HTTPS");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => {
      const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
      return mapped
        ? PRIVATE_RANGES.check(mapped, "ipv4")
        : PRIVATE_RANGES.check(address, family === 6 ? "ipv6" : "ipv4");
    })
  ) {
    throw new Error("Icon host resolves to a private address");
  }
}

async function readLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > maxBytes) throw new Error("Response too large");
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Fetch a sponsor-supplied URL. Every hop is re-checked so a redirect cannot
 * reach an internal address. (DNS can still change between check and connect;
 * sponsors are signed in and reviewed, which bounds that residual risk.)
 */
async function guardedFetch(input: string, maxBytes: number, accept: string) {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!TRUSTED_ICON_HOSTS.has(url.hostname)) await assertPublicHost(url);
    const response = await fetch(url, {
      redirect: "manual",
      headers: { accept, "user-agent": "EizokiIconFetcher/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status}`);
    }
    return {
      url,
      contentType: response.headers.get("content-type") ?? "",
      body: await readLimited(response, maxBytes),
    };
  }
  throw new Error("Too many redirects");
}

/** Sharp cannot decode ICO; modern ICO files usually embed PNG frames. */
function largestPngInIco(buffer: Buffer) {
  if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0) return null;
  if (buffer.readUInt16LE(2) !== 1) return null;
  const count = buffer.readUInt16LE(4);
  let best: Buffer | null = null;
  let bestWidth = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    if (entry + 16 > buffer.length) break;
    const width = buffer[entry] || 256;
    const size = buffer.readUInt32LE(entry + 8);
    const offset = buffer.readUInt32LE(entry + 12);
    if (offset + size > buffer.length) continue;
    const frame = buffer.subarray(offset, offset + size);
    const isPng = frame.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    if (isPng && width > bestWidth) {
      best = frame;
      bestWidth = width;
    }
  }
  return best;
}

/** Square, transparent-padded 128px WebP: small enough to inline anywhere. */
export async function normaliseSponsorIcon(input: Buffer) {
  const source = largestPngInIco(input) ?? input;
  return sharp(source, { limitInputPixels: 4096 * 4096, animated: false })
    .resize(ICON_SIZE, ICON_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer();
}

/** `<link rel="…icon…" href>` values, apple/touch icons (larger) first. */
function declaredIcons(html: string, base: URL) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const icons: { href: string; rank: number }[] = [];
  for (const tag of links) {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase();
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!rel || !href || !rel.split(/\s+/).some((r) => r.includes("icon")))
      continue;
    try {
      const url = new URL(href.replace(/&amp;/g, "&"), base);
      if (url.protocol !== "https:") continue;
      icons.push({ href: url.toString(), rank: rel.includes("apple") ? 0 : 1 });
    } catch {
      // Ignore malformed hrefs.
    }
  }
  return icons.sort((a, b) => a.rank - b.rank).map((icon) => icon.href);
}

/**
 * Find the sponsor's own icon, server-side: icons declared in the homepage
 * first, then the conventional paths. Returns a normalised WebP, or null.
 */
export async function fetchWebsiteIcon(websiteUrl: string) {
  const candidates: string[] = [];
  let origin: URL;
  try {
    const page = await guardedFetch(websiteUrl, MAX_HTML_BYTES, "text/html");
    origin = new URL(page.url.origin);
    if (page.contentType.includes("html")) {
      candidates.push(...declaredIcons(page.body.toString("utf8"), page.url));
    }
  } catch {
    origin = new URL(new URL(websiteUrl).origin);
  }
  for (const fallback of [
    "/apple-touch-icon.png",
    "/apple-icon.png",
    "/icon.png",
    "/favicon.ico",
  ]) {
    candidates.push(new URL(fallback, origin).toString());
  }

  for (const candidate of [...new Set(candidates)].slice(0, 6)) {
    try {
      const icon = await guardedFetch(candidate, MAX_REMOTE_ICON_BYTES, "image/*");
      if (icon.contentType.includes("html")) continue;
      return await normaliseSponsorIcon(icon.body);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/**
 * Turn a stored icon into a data URI so it ships inside the HTML and paints
 * with the page. Falls back to the plain URL when it cannot be inlined.
 */
export async function inlineSponsorIcon(iconUrl: string | null) {
  if (!iconUrl) return null;
  try {
    let bytes: Buffer;
    if (iconUrl.startsWith("/") && !iconUrl.includes("..")) {
      // A file in /public, such as a sponsor arranged before self-serve booking.
      const file = path.join(process.cwd(), "public", path.normalize(iconUrl));
      bytes = await normaliseSponsorIcon(await readFile(file));
    } else {
      const url = new URL(iconUrl);
      if (!TRUSTED_ICON_HOSTS.has(url.hostname)) return iconUrl;
      // Ask ImageKit for the small WebP, so older full-size uploads inline too.
      url.searchParams.set("tr", `w-${ICON_SIZE},h-${ICON_SIZE},c-at_max,f-webp`);
      bytes = (await guardedFetch(url.toString(), MAX_INLINE_BYTES, "image/*"))
        .body;
      if (bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
        bytes = await normaliseSponsorIcon(bytes);
      }
    }
    if (bytes.length > MAX_INLINE_BYTES) return iconUrl;
    return `data:image/webp;base64,${bytes.toString("base64")}`;
  } catch {
    return iconUrl;
  }
}
