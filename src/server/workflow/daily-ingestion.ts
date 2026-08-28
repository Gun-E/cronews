import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { articleClusterMembers, articleClusters, articles, newsSources, puzzles, quizCandidates, workflowRuns } from "@/server/db/schema";
import { clusterArticles, clusterKey } from "@/server/ingestion/cluster";
import { fetchFeed } from "@/server/ingestion/feed";
import { articleFingerprint } from "@/server/ingestion/normalize";
import { generateNewsQuiz } from "@/server/llm/generate-news-quiz";
import { NEWS_QUIZ_PROMPT_VERSION } from "@/server/llm/news-prompt";
import { generatePuzzle } from "@/server/puzzle/generator";

export interface IngestionSummary { sources: number; discovered: number; generated: number; failed: number; }

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
  let generated = 0;
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const pending = await db.select().from(articles).where(and(eq(articles.status, "NORMALIZED"), gte(articles.createdAt, dayStart))).limit(120);
  const groups = clusterArticles(pending.map((article) => ({
    externalId: article.id,
    title: article.title,
    url: article.canonicalUrl,
    summary: article.summary ?? undefined,
    publishedAt: article.publishedAt ?? undefined,
  }))).sort((a, b) => b.length - a.length).slice(0, 2);

  for (const group of groups) {
    try {
      const key = clusterKey(group);
      const [cluster] = await db.insert(articleClusters).values({ representativeTitle: group[0].title, clusterKey: key })
        .onConflictDoUpdate({ target: articleClusters.clusterKey, set: { representativeTitle: group[0].title } }).returning();
      for (const item of group) {
        if (!item.externalId) continue;
        await db.insert(articleClusterMembers).values({ clusterId: cluster.id, articleId: item.externalId }).onConflictDoNothing();
      }
      const result = await generateNewsQuiz(cluster.id, group);
      for (const candidate of result.data.candidates) {
        await db.insert(quizCandidates).values({
          clusterId: cluster.id,
          answer: candidate.answer,
          normalizedAnswer: candidate.normalizedAnswer,
          question: candidate.question,
          hint: candidate.hints[0],
          hints: candidate.hints,
          explanation: candidate.explanation,
          difficulty: candidate.difficulty,
          confidence: Math.round(candidate.confidence * 100),
          evidence: candidate.evidence,
          status: candidate.confidence >= 0.9 ? "VALIDATED" : "REVIEW_REQUIRED",
          promptVersion: NEWS_QUIZ_PROMPT_VERSION,
        }).onConflictDoNothing();
        generated++;
      }
      for (const item of group) {
        if (item.externalId) await db.update(articles).set({ status: "CLUSTERED" }).where(eq(articles.id, item.externalId));
      }
    } catch (error) {
      failed++;
      console.error("quiz generation failed", error);
    }
  }
  const dailyCandidates = await db.select().from(quizCandidates)
    .where(and(gte(quizCandidates.createdAt, dayStart), eq(quizCandidates.promptVersion, NEWS_QUIZ_PROMPT_VERSION)))
    .orderBy(sql`${quizCandidates.confidence} desc`)
    .limit(12);
  if (dailyCandidates.length >= 2) {
    const memberships = await db.select({ clusterId: articleClusterMembers.clusterId, title: articles.title, url: articles.canonicalUrl })
      .from(articleClusterMembers).innerJoin(articles, eq(articleClusterMembers.articleId, articles.id));
    const sourcesByCluster = new Map<string, { title: string; url: string; publisher?: string }[]>();
    for (const item of memberships) {
      const current = sourcesByCluster.get(item.clusterId) ?? [];
      if (!current.some((source) => source.url === item.url)) {
        let publisher: string | undefined;
        try { publisher = new URL(item.url).hostname.replace(/^www\./, ""); } catch { publisher = undefined; }
        current.push({ title: item.title, url: item.url, publisher });
      }
      sourcesByCluster.set(item.clusterId, current.slice(0, 3));
    }
    for (let sequenceNumber = 1; sequenceNumber <= 30; sequenceNumber++) {
      const offset = (sequenceNumber - 1) % dailyCandidates.length;
      const rotated = [...dailyCandidates.slice(offset), ...dailyCandidates.slice(0, offset)];
      const board = generatePuzzle(rotated.map((candidate) => ({
        id: candidate.id,
        answer: candidate.normalizedAnswer,
        question: candidate.question,
        hint: candidate.hint,
        hints: Array.isArray(candidate.hints) ? candidate.hints as string[] : [candidate.hint],
        explanation: candidate.explanation,
        sources: sourcesByCluster.get(candidate.clusterId) ?? [],
      })), 15);
      if (board.words.length < 2) continue;
      await db.insert(puzzles).values({
        editionDate,
        category: `DAILY-${String(sequenceNumber).padStart(2, "0")}`,
        sequenceNumber,
        width: board.width,
        height: board.height,
        seed: `${editionDate}:${NEWS_QUIZ_PROMPT_VERSION}:${sequenceNumber}`,
        grid: board,
        status: "PUBLISHED",
        publishedAt: new Date(),
      }).onConflictDoUpdate({
        target: [puzzles.editionDate, puzzles.sequenceNumber],
        set: { width: board.width, height: board.height, grid: board, seed: `${editionDate}:${NEWS_QUIZ_PROMPT_VERSION}:${sequenceNumber}`, status: "PUBLISHED", publishedAt: new Date() },
      });
    }
  }
  const details = { sources: sources.length, discovered, generated, failed };
  await db.update(workflowRuns).set({ status: failed ? "PARTIAL" : "SUCCEEDED", currentStep: "DONE", details, finishedAt: new Date() }).where(eq(workflowRuns.id, run.id));
  return details;
}
