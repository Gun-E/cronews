import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]);

export function normalizeWhitespace(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

export function normalizeTitle(title: string): string {
  return normalizeWhitespace(title)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\[\]【】()「」『』“”‘’'".,!?·…:;\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function articleFingerprint(title: string, publishedAt?: Date): string {
  const day = publishedAt?.toISOString().slice(0, 10) ?? "unknown";
  return createHash("sha256").update(`${normalizeTitle(title)}|${day}`).digest("hex");
}
