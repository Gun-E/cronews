import { getDb } from "./client";
import { newsSources } from "./schema";

export const DEFAULT_SOURCES = [
  { name: "연합뉴스", homepageUrl: "https://www.yna.co.kr", feedUrl: "https://www.yna.co.kr/rss/news.xml", category: "ALL", trustWeight: 90 },
  { name: "한겨레", homepageUrl: "https://www.hani.co.kr", feedUrl: "https://www.hani.co.kr/rss/", category: "ALL", trustWeight: 80 },
  { name: "동아일보", homepageUrl: "https://www.donga.com", feedUrl: "https://rss.donga.com/total.xml", category: "ALL", trustWeight: 80 },
  { name: "경향신문", homepageUrl: "https://www.khan.co.kr", feedUrl: "https://www.khan.co.kr/rss/rssdata/total_news.xml", category: "ALL", trustWeight: 80 },
  { name: "조선일보", homepageUrl: "https://www.chosun.com", feedUrl: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml", category: "ALL", trustWeight: 75 },
  { name: "매일경제", homepageUrl: "https://www.mk.co.kr", feedUrl: "https://www.mk.co.kr/rss/30000001/", category: "ECONOMY", trustWeight: 75 },
  { name: "뉴시스", homepageUrl: "https://www.newsis.com", feedUrl: "https://www.newsis.com/RSS/sokbo.xml", category: "ALL", trustWeight: 75 },
  { name: "SBS 뉴스", homepageUrl: "https://news.sbs.co.kr", feedUrl: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER", category: "ALL", trustWeight: 75 },
  { name: "전자신문", homepageUrl: "https://www.etnews.com", feedUrl: "https://rss.etnews.com/Section901.xml", category: "TECHNOLOGY", trustWeight: 75 },
];

export async function seedSources() {
  const db = getDb();
  for (const source of DEFAULT_SOURCES) await db.insert(newsSources).values(source).onConflictDoNothing({ target: newsSources.feedUrl });
}
