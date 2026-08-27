import { getDb } from "./client";
import { newsSources } from "./schema";

export const DEFAULT_SOURCES = [
  { name: "대한민국 정책브리핑", homepageUrl: "https://www.korea.kr", feedUrl: "https://www.korea.kr/rss/policy.xml", category: "SOCIETY", trustWeight: 80 },
];

export async function seedSources() {
  const db = getDb();
  for (const source of DEFAULT_SOURCES) await db.insert(newsSources).values(source).onConflictDoNothing({ target: newsSources.feedUrl });
}
