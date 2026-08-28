import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { articleClusterMembers, articleClusters, articles, newsSources, puzzles, quizCandidates, workflowRuns } from "@/server/db/schema";
import { clusterArticles, clusterKey } from "@/server/ingestion/cluster";
import { fetchFeed } from "@/server/ingestion/feed";
import { articleFingerprint } from "@/server/ingestion/normalize";
import { generateNewsQuiz } from "@/server/llm/generate-news-quiz";
import { NEWS_QUIZ_PROMPT_VERSION } from "@/server/llm/news-prompt";
import { generateBalancedPuzzle, isPuzzleConnected } from "@/server/puzzle/generator";
import type { PuzzleBoard, PuzzleInput } from "@/server/puzzle/types";

export interface IngestionSummary { sources: number; discovered: number; generated: number; failed: number; }

const FALLBACK_STOP_WORDS = new Set(["관련", "대한", "위한", "오늘", "정부", "한국", "발표", "기자", "뉴스", "단독", "종합", "논란"]);

function fallbackQuizItems(group: { title: string; url: string; externalId?: string }[]) {
  const seen = new Set<string>();
  return group.flatMap((article) => {
    const answer = (article.title.match(/[가-힣A-Za-z0-9]{2,8}/g) ?? [])
      .map((word) => word.replace(/^(속보|단독|종합)$/, ""))
      .find((word) => word.length >= 2 && !FALLBACK_STOP_WORDS.has(word) && !seen.has(word));
    if (!answer) return [];
    seen.add(answer);
    const masked = article.title.replace(answer, "○".repeat([...answer].length));
    let publisher = "뉴스 원문";
    try { publisher = new URL(article.url).hostname.replace(/^www\./, ""); } catch { /* keep fallback */ }
    return [{
      answer,
      normalizedAnswer: answer.normalize("NFC").replace(/\s/g, "").toUpperCase(),
      question: `“${masked}” 기사 제목의 빈칸에 들어갈 핵심어는 무엇일까요?`,
      hints: [
        "오늘 수집된 주요 뉴스 제목에 등장한 핵심어입니다.",
        `출처는 ${publisher} 기사입니다.`,
        "기사 제목에서 사건의 핵심 대상이 되는 표현입니다.",
        `첫 글자는 ‘${[...answer][0]}’입니다.`,
        `정답은 ‘${answer}’입니다.`,
      ],
      explanation: `원문 기사 제목은 “${article.title}”입니다. 기사 원문에서 맥락을 확인할 수 있습니다.`,
      evidence: [{ articleId: article.externalId ?? article.url, fact: article.title }],
    }];
  }).slice(0, 5);
}

export function buildDistinctDailyBoards(inputs: PuzzleInput[], limit = 30): PuzzleBoard[] {
  const candidates = inputs.slice(0, 120);
  const boards: PuzzleBoard[] = [];
  const signatures = new Set<string>();
  for (let attempt = 0; attempt < 5000 && boards.length < limit; attempt++) {
    const shuffled = [...candidates];
    let seed = ((attempt + 1) * 2654435761) >>> 0;
    for (let index = shuffled.length - 1; index > 0; index--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const swapIndex = seed % (index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    let board: PuzzleBoard;
    try { board = generateBalancedPuzzle(shuffled, 12); } catch { continue; }
    if (!isPuzzleConnected(board)) continue;
    const signature = board.words.map((word) => word.id).sort().join(":");
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    boards.push(board);
  }
  return boards;
}

export async function runDailyIngestion(date = new Date()): Promise<IngestionSummary> {
  const db = getDb();
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
  const idempotencyKey = `daily-ingestion:${editionDate}`;
  const [run] = await db.insert(workflowRuns).values({ idempotencyKey, status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date() })
    .onConflictDoUpdate({ target: workflowRuns.idempotencyKey, set: { status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date() } }).returning();
  const sources = await db.select().from(newsSources).where(eq(newsSources.enabled, true));
  let discovered = 0, failed = 0;
  await Promise.all(sources.map(async (source) => {
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
  }));
  let generated = 0;
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const pendingBySource = await Promise.all(sources.map((source) => db.select().from(articles)
    .where(and(eq(articles.sourceId, source.id), eq(articles.status, "NORMALIZED"), gte(articles.createdAt, dayStart))).limit(30)));
  const pending = Array.from({ length: 30 }, (_, index) => pendingBySource.map((items) => items[index]).filter(Boolean)).flat();
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
      try {
        const key = clusterKey(group);
        const [cluster] = await db.insert(articleClusters).values({ representativeTitle: group[0].title, clusterKey: key })
          .onConflictDoUpdate({ target: articleClusters.clusterKey, set: { representativeTitle: group[0].title } }).returning();
        for (const item of group) if (item.externalId) await db.insert(articleClusterMembers).values({ clusterId: cluster.id, articleId: item.externalId }).onConflictDoNothing();
        for (const candidate of fallbackQuizItems(group)) {
          await db.insert(quizCandidates).values({ clusterId: cluster.id, answer: candidate.answer, normalizedAnswer: candidate.normalizedAnswer, question: candidate.question, hint: candidate.hints[0], hints: candidate.hints, explanation: candidate.explanation, difficulty: "MEDIUM", confidence: 80, evidence: candidate.evidence, status: "VALIDATED", promptVersion: NEWS_QUIZ_PROMPT_VERSION }).onConflictDoNothing();
          generated++;
        }
        for (const item of group) if (item.externalId) await db.update(articles).set({ status: "CLUSTERED" }).where(eq(articles.id, item.externalId));
      } catch (fallbackError) { console.error("fallback quiz generation failed", fallbackError); }
    }
  }
  const existingDailyCandidates = await db.select().from(quizCandidates)
    .where(and(gte(quizCandidates.createdAt, dayStart), eq(quizCandidates.promptVersion, NEWS_QUIZ_PROMPT_VERSION)))
    .orderBy(sql`${quizCandidates.confidence} desc`)
    .limit(120);
  if (existingDailyCandidates.length < 120) {
    let fallbackPoolSize = existingDailyCandidates.length;
    for (const article of pending) {
      const [candidate] = fallbackQuizItems([{ title: article.title, url: article.canonicalUrl, externalId: article.id }]);
      if (!candidate) continue;
      const key = clusterKey([{ externalId: article.id, title: article.title, url: article.canonicalUrl, summary: article.summary ?? undefined, publishedAt: article.publishedAt ?? undefined }]);
      const [cluster] = await db.insert(articleClusters).values({ representativeTitle: article.title, clusterKey: key })
        .onConflictDoUpdate({ target: articleClusters.clusterKey, set: { representativeTitle: article.title } }).returning();
      await db.insert(articleClusterMembers).values({ clusterId: cluster.id, articleId: article.id }).onConflictDoNothing();
      await db.insert(quizCandidates).values({ clusterId: cluster.id, answer: candidate.answer, normalizedAnswer: candidate.normalizedAnswer, question: candidate.question, hint: candidate.hints[0], hints: candidate.hints, explanation: candidate.explanation, difficulty: "MEDIUM", confidence: 80, evidence: candidate.evidence, status: "VALIDATED", promptVersion: NEWS_QUIZ_PROMPT_VERSION }).onConflictDoNothing();
      generated++;
      if (++fallbackPoolSize >= 120) break;
    }
  }
  const dailyCandidates = await db.select().from(quizCandidates)
    .where(and(gte(quizCandidates.createdAt, dayStart), eq(quizCandidates.promptVersion, NEWS_QUIZ_PROMPT_VERSION)))
    .orderBy(sql`${quizCandidates.confidence} desc`)
    .limit(120);
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
    const puzzleInputs = dailyCandidates.map((candidate) => ({
        id: candidate.id,
        answer: candidate.normalizedAnswer,
        question: candidate.question,
        hint: candidate.hint,
        hints: Array.isArray(candidate.hints) ? candidate.hints as string[] : [candidate.hint],
        explanation: candidate.explanation,
        sources: sourcesByCluster.get(candidate.clusterId) ?? [],
      }));
    const dailyBoards = buildDistinctDailyBoards(puzzleInputs, 30);
    if (dailyBoards.length < 30) throw new Error(`Only ${dailyBoards.length} distinct daily puzzles could be generated`);
    for (const [index, board] of dailyBoards.entries()) {
      const sequenceNumber = index + 1;
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
