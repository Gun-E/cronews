import { XMLParser } from "fast-xml-parser";
import { canonicalizeUrl, normalizeWhitespace } from "./normalize";
import type { FeedArticle, FeedFetchResult } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false });
const array = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

function text(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return normalizeWhitespace(String(value));
  if (value && typeof value === "object" && "#text" in value) return text((value as { "#text": unknown })["#text"]);
  return undefined;
}

function safeDate(value: unknown): Date | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  const date = new Date(parsed);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export function parseFeed(xml: string): FeedArticle[] {
  const document = parser.parse(xml);
  const rssItems = array(document?.rss?.channel?.item);
  const atomItems = array(document?.feed?.entry);
  type RawArticle = Omit<FeedArticle, "url"> & { url?: string };
  const rssArticles: RawArticle[] = rssItems.map((item: Record<string, unknown>) => ({
    externalId: text(item.guid), title: text(item.title) ?? "", url: text(item.link) ?? "",
    summary: text(item.description), publishedAt: safeDate(item.pubDate),
  }));
  const atomArticles: RawArticle[] = atomItems.map((entry: Record<string, unknown>) => {
    const links = array(entry.link as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const alternate = links.find((link) => !link["@_rel"] || link["@_rel"] === "alternate") ?? links[0];
    return { externalId: text(entry.id), title: text(entry.title) ?? "", url: text(alternate?.["@_href"]), summary: text(entry.summary ?? entry.content), publishedAt: safeDate(entry.published ?? entry.updated) };
  });
  const articles = [...rssArticles, ...atomArticles];
  return articles
    .filter((article): article is FeedArticle => Boolean(article.title && article.url))
    .map((article) => ({ ...article, url: canonicalizeUrl(article.url) }));
}

export async function fetchFeed(feedUrl: string, cache?: { etag?: string; lastModified?: string }): Promise<FeedFetchResult> {
  const url = new URL(feedUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP(S) feeds are supported");
  const headers: Record<string, string> = { "User-Agent": "CRONEWS/2.0 (+https://cronews.vercel.app)" };
  if (cache?.etag) headers["If-None-Match"] = cache.etag;
  if (cache?.lastModified) headers["If-Modified-Since"] = cache.lastModified;
  const response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(15_000) });
  if (response.status === 304) return { articles: [], notModified: true, etag: cache?.etag, lastModified: cache?.lastModified };
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("xml") && !contentType.includes("rss") && !contentType.includes("atom")) throw new Error(`Unexpected feed content type: ${contentType}`);
  const xml = await response.text();
  if (xml.length > 5_000_000) throw new Error("Feed is too large");
  return { articles: parseFeed(xml), notModified: false, etag: response.headers.get("etag") ?? undefined, lastModified: response.headers.get("last-modified") ?? undefined };
}
