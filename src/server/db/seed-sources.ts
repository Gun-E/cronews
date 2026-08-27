import { getDb } from "./client";
import { newsSources } from "./schema";

export const DEFAULT_SOURCES = [
  { name: "연합뉴스", homepageUrl: "https://www.yna.co.kr", feedUrl: "https://www.yna.co.kr/rss/news.xml", category: "ALL", trustWeight: 90 },
  { name: "한겨레", homepageUrl: "https://www.hani.co.kr", feedUrl: "https://www.hani.co.kr/rss/", category: "ALL", trustWeight: 80 },
  { name: "동아일보", homepageUrl: "https://www.donga.com", feedUrl: "https://rss.donga.com/total.xml", category: "ALL", trustWeight: 80 },
  { name: "경향신문", homepageUrl: "https://www.khan.co.kr", feedUrl: "https://www.khan.co.kr/rss/rssdata/total_news.xml", category: "ALL", trustWeight: 80 },
];

export async function seedSources() {
  const db = getDb();
  for (const source of DEFAULT_SOURCES) await db.insert(newsSources).values(source).onConflictDoNothing({ target: newsSources.feedUrl });
}
