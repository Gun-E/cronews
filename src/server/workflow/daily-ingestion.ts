import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { articles, newsSources, workflowRuns } from "@/server/db/schema";
import { fetchFeed } from "@/server/ingestion/feed";
import { articleFingerprint } from "@/server/ingestion/normalize";

export interface IngestionSummary { sources: number; discovered: number; failed: number; }

export async function runDailyIngestion(date = new Date()): Promise<IngestionSummary> {
  const db = getDb();
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
  const idempotencyKey = `daily-ingestion:${editionDate}`;
  const [run] = await db.insert(workflowRuns).values({ idempotencyKey, status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date() })
    .onConflictDoUpdate({ target: workflowRuns.idempotencyKey, set: { status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date() } }).returning();
  const sources = await db.select().from(newsSources).where(eq(newsSources.enabled, true));
  let discovered = 0, failed = 0;
  for (const source of sources) {
    try {
      const result = await fetchFeed(source.feedUrl, { etag: source.etag ?? undefined, lastModified: source.lastModified ?? undefined });
      for (const article of result.articles) {
        await db.insert(articles).values({ sourceId: source.id, canonicalUrl: article.url, title: article.title, summary: article.summary, publishedAt: article.publishedAt, fingerprint: articleFingerprint(article.title, article.publishedAt), status: "NORMALIZED" }).onConflictDoNothing({ target: articles.canonicalUrl });
        discovered++;
      }
      await db.update(newsSources).set({ etag: result.etag, lastModified: result.lastModified, lastFetchedAt: new Date(), failureCount: 0 }).where(eq(newsSources.id, source.id));
    } catch {
      failed++;
      await db.update(newsSources).set({ failureCount: sql`${newsSources.failureCount} + 1` }).where(eq(newsSources.id, source.id));
    }
  }
  await db.update(workflowRuns).set({ status: failed ? "PARTIAL" : "SUCCEEDED", currentStep: "DONE", details: { sources: sources.length, discovered, failed }, finishedAt: new Date() }).where(eq(workflowRuns.id, run.id));
  return { sources: sources.length, discovered, failed };
}
