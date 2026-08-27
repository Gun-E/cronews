import { describe, expect, it } from "vitest";
import { parseFeed } from "./feed";
import { articleFingerprint, canonicalizeUrl } from "./normalize";

describe("feed ingestion", () => {
  it("parses and normalizes an RSS item", () => {
    const [article] = parseFeed(`<rss><channel><item><title><![CDATA[ 오늘의 뉴스 ]]></title><link>https://example.com/a?utm_source=x</link><description>요약</description><pubDate>Fri, 28 Aug 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
    expect(article.title).toBe("오늘의 뉴스");
    expect(article.url).toBe("https://example.com/a");
  });
  it("removes tracking parameters and creates stable fingerprints", () => {
    expect(canonicalizeUrl("https://EXAMPLE.com/a/?utm_medium=social#x")).toBe("https://example.com/a");
    expect(articleFingerprint("[속보] 같은 뉴스", new Date("2026-08-28"))).toBe(articleFingerprint("속보 같은 뉴스", new Date("2026-08-28")));
  });
});
