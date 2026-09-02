import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { articleClusterMembers, articleClusters, articles, newsSources, puzzles, quizCandidates, workflowRuns } from "@/server/db/schema";
import { clusterArticles, clusterKey } from "@/server/ingestion/cluster";
import { fetchFeed } from "@/server/ingestion/feed";
import { articleFingerprint } from "@/server/ingestion/normalize";
import { generateNewsQuiz } from "@/server/llm/generate-news-quiz";
import { NEWS_QUIZ_PROMPT_VERSION } from "@/server/llm/news-prompt";
import { crosswordDiagonalBias, generateBalancedPuzzle, validateCrosswordRules } from "@/server/puzzle/generator";
import { deduplicatePuzzleInputs } from "@/server/puzzle/deduplicate";
import type { PuzzleBoard, PuzzleInput } from "@/server/puzzle/types";

export interface IngestionSummary { sources: number; discovered: number; generated: number; failed: number; }

const FALLBACK_STOP_WORDS = new Set(["관련", "대한", "위한", "오늘", "정부", "한국", "발표", "기자", "뉴스", "단독", "종합", "논란"]);

function fallbackQuizItems(group: { title: string; url: string; externalId?: string }[]) {
  const seen = new Set<string>();
  return group.flatMap((article) => {
    let publisher = "뉴스 원문";
    try { publisher = new URL(article.url).hostname.replace(/^www\./, ""); } catch { /* keep fallback */ }
    const answers = (article.title.match(/[가-힣A-Za-z0-9]{2,10}/g) ?? [])
      .map((word) => word.replace(/^(속보|단독|종합)$/, "").replace(/(에서|에게|으로|은|는|이|가|을|를|에|의|로|과|와|도|만)$/u, ""))
      .filter((word) => word.length >= 2 && word.length <= 8 && !FALLBACK_STOP_WORDS.has(word) && !seen.has(word))
      .slice(0, 3);
    return answers.map((answer) => {
      seen.add(answer);
      const masked = article.title.replace(answer, "○".repeat([...answer].length));
      return {
      answer,
      normalizedAnswer: answer.normalize("NFC").replace(/\s/g, "").toUpperCase(),
      question: `“${masked}” 기사 제목의 빈칸에 들어갈 핵심어는 무엇일까요?`,
      hints: [
        `“${masked}”라는 뉴스 맥락에서 핵심 대상이 되는 표현입니다.`,
        `첫 글자는 ‘${[...answer][0]}’입니다.`,
        "초성은 다음 단계에서 앱이 자동으로 제공합니다.",
        `${publisher} 뉴스 원문 보기`,
        `정답은 ‘${answer}’입니다.`,
      ],
      explanation: `원문 기사 제목은 “${article.title}”입니다. 기사 원문에서 맥락을 확인할 수 있습니다.`,
      evidence: [{ articleId: article.externalId ?? article.url, fact: article.title }],
      };
    });
  }).slice(0, 15);
}

export function buildDistinctDailyBoards(inputs: PuzzleInput[], limit = 30): PuzzleBoard[] {
  const candidates = deduplicatePuzzleInputs(inputs).slice(0, 180);
  const rankedSeeds = [...candidates].sort((a, b) => {
    const degree = (word: PuzzleInput) => candidates.reduce((count, other) => count + (other.id !== word.id && [...word.answer].some((character) => other.answer.includes(character)) ? 1 : 0), 0);
    return degree(b) - degree(a);
  });
  const boards: PuzzleBoard[] = [];
  const signatures = new Set<string>();
  for (let attempt = 0; attempt < 300 && boards.length < limit; attempt++) {
    const seedWord = rankedSeeds[attempt % Math.min(80, rankedSeeds.length)];
    const shuffled = candidates.filter((word) => word.id !== seedWord.id);
    let seed = ((attempt + 1) * 2654435761) >>> 0;
    for (let index = shuffled.length - 1; index > 0; index--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const swapIndex = seed % (index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    shuffled.unshift(seedWord);
    let board: PuzzleBoard;
    try { board = generateBalancedPuzzle(shuffled, 12); } catch { continue; }
    if (!validateCrosswordRules(board)) continue;
    if (crosswordDiagonalBias(board) > 0.42) continue;
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
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  await db.update(workflowRuns).set({ status: "FAILED", currentStep: "STALE_RECOVERED", finishedAt: new Date() })
    .where(and(eq(workflowRuns.status, "RUNNING"), lt(workflowRuns.startedAt, staleBefore)));
  const [run] = await db.insert(workflowRuns).values({ idempotencyKey, status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date() })
    .onConflictDoUpdate({ target: workflowRuns.idempotencyKey, set: { status: "RUNNING", currentStep: "FETCH_FEEDS", startedAt: new Date(), finishedAt: null, details: {} } }).returning();
  try {
  const sources = await db.select().from(newsSources).where(eq(newsSources.enabled, true));
  const [{ count: alreadyPublished }] = await db.select({ count: sql<number>`count(*)::int` }).from(puzzles).where(and(eq(puzzles.editionDate, editionDate), eq(puzzles.status, "PUBLISHED")));
  if (alreadyPublished >= 30) {
    const details = { sources: sources.length, discovered: 0, generated: 0, failed: 0 };
    await db.update(workflowRuns).set({ status: "SUCCEEDED", currentStep: "ALREADY_PUBLISHED", details, finishedAt: new Date() }).where(eq(workflowRuns.id, run.id));
    return details;
  }
  let discovered = 0, failed = 0;
  await Promise.all(sources.map(async (source) => {
    try {
      const result = await fetchFeed(source.feedUrl, { etag: source.etag ?? undefined, lastModified: source.lastModified ?? undefined });
      if (result.articles.length) await db.insert(articles).values(result.articles.map((article) => ({ sourceId: source.id, canonicalUrl: article.url, title: article.title, summary: article.summary, publishedAt: article.publishedAt, fingerprint: articleFingerprint(article.title, article.publishedAt), status: "NORMALIZED" as const }))).onConflictDoNothing({ target: articles.canonicalUrl });
      discovered += result.articles.length;
      await db.update(newsSources).set({ etag: result.etag, lastModified: result.lastModified, lastFetchedAt: new Date(), failureCount: 0 }).where(eq(newsSources.id, source.id));
    } catch {
      failed++;
      await db.update(newsSources).set({ failureCount: sql`${newsSources.failureCount} + 1` }).where(eq(newsSources.id, source.id));
    }
  }));
  await db.update(workflowRuns).set({ currentStep: "BUILD_CANDIDATES", details: { sources: sources.length, discovered, failed } }).where(eq(workflowRuns.id, run.id));
  let generated = 0;
  const dayStart = new Date(`${editionDate}T00:00:00+09:00`);
  const pendingBySource = await Promise.all(sources.map((source) => db.select().from(articles)
    .where(and(eq(articles.sourceId, source.id), eq(articles.status, "NORMALIZED"), gte(articles.createdAt, dayStart))).limit(30)));
  const pending = Array.from({ length: 30 }, (_, index) => pendingBySource.map((items) => items[index]).filter(Boolean)).flat();
  const candidateArticlesBySource = await Promise.all(sources.map((source) => db.select().from(articles)
    .where(and(eq(articles.sourceId, source.id), gte(articles.createdAt, dayStart))).limit(40)));
  const candidateArticlePool = Array.from({ length: 40 }, (_, index) => candidateArticlesBySource.map((items) => items[index]).filter(Boolean)).flat();
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
      const articleIds = group.flatMap((item) => item.externalId ? [item.externalId] : []);
      if (articleIds.length) await db.insert(articleClusterMembers).values(articleIds.map((articleId) => ({ clusterId: cluster.id, articleId }))).onConflictDoNothing();
      const result = await Promise.race([generateNewsQuiz(cluster.id, group), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LLM_TIMEOUT")), 25_000))]);
      if (result.data.candidates.length) await db.insert(quizCandidates).values(result.data.candidates.map((candidate) => ({
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
          status: candidate.confidence >= 0.9 ? "VALIDATED" as const : "REVIEW_REQUIRED" as const,
          promptVersion: NEWS_QUIZ_PROMPT_VERSION,
        }))).onConflictDoNothing();
      generated += result.data.candidates.length;
      if (articleIds.length) await db.update(articles).set({ status: "CLUSTERED" }).where(inArray(articles.id, articleIds));
    } catch (error) {
      console.error("quiz generation failed", error);
      try {
        const key = clusterKey(group);
        const [cluster] = await db.insert(articleClusters).values({ representativeTitle: group[0].title, clusterKey: key })
          .onConflictDoUpdate({ target: articleClusters.clusterKey, set: { representativeTitle: group[0].title } }).returning();
        const articleIds = group.flatMap((item) => item.externalId ? [item.externalId] : []);
        if (articleIds.length) await db.insert(articleClusterMembers).values(articleIds.map((articleId) => ({ clusterId: cluster.id, articleId }))).onConflictDoNothing();
        const fallbackCandidates = fallbackQuizItems(group);
        if (fallbackCandidates.length) await db.insert(quizCandidates).values(fallbackCandidates.map((candidate) => ({ clusterId: cluster.id, answer: candidate.answer, normalizedAnswer: candidate.normalizedAnswer, question: candidate.question, hint: candidate.hints[0], hints: candidate.hints, explanation: candidate.explanation, difficulty: "MEDIUM", confidence: 80, evidence: candidate.evidence, status: "VALIDATED" as const, promptVersion: NEWS_QUIZ_PROMPT_VERSION }))).onConflictDoNothing();
        generated += fallbackCandidates.length;
        if (articleIds.length) await db.update(articles).set({ status: "CLUSTERED" }).where(inArray(articles.id, articleIds));
      } catch (fallbackError) { failed++; console.error("fallback quiz generation failed", fallbackError); }
    }
  }
  const existingDailyCandidates = await db.select().from(quizCandidates)
    .where(and(gte(quizCandidates.createdAt, dayStart), eq(quizCandidates.promptVersion, NEWS_QUIZ_PROMPT_VERSION)))
    .orderBy(sql`${quizCandidates.confidence} desc`)
    .limit(300);
  if (existingDailyCandidates.length < 300) {
    let fallbackPoolSize = existingDailyCandidates.length;
    const fallbackPlans: { article: typeof candidateArticlePool[number]; key: string; candidates: ReturnType<typeof fallbackQuizItems> }[] = [];
    const fallbackKeys = new Set<string>();
    const fallbackGroups = clusterArticles(candidateArticlePool.map((article) => ({ externalId: article.id, title: article.title, url: article.canonicalUrl, summary: article.summary ?? undefined, publishedAt: article.publishedAt ?? undefined })));
    for (const group of fallbackGroups) {
      const representative = group[0];
      const article = candidateArticlePool.find((item) => item.id === representative.externalId);
      if (!article) continue;
      const fallbackCandidates = fallbackQuizItems(group).slice(0, 3);
      if (!fallbackCandidates.length) continue;
      const key = clusterKey(group);
      if (fallbackKeys.has(key)) continue;
      fallbackKeys.add(key);
      const remaining = 300 - fallbackPoolSize;
      fallbackPlans.push({ article, key, candidates: fallbackCandidates.slice(0, remaining) });
      fallbackPoolSize += Math.min(fallbackCandidates.length, remaining);
      if (fallbackPoolSize >= 300) break;
    }
    if (fallbackPlans.length) {
      const clusterRows = await db.insert(articleClusters).values(fallbackPlans.map((plan) => ({ representativeTitle: plan.article.title, clusterKey: plan.key })))
        .onConflictDoUpdate({ target: articleClusters.clusterKey, set: { representativeTitle: sql`excluded.representative_title` } }).returning({ id: articleClusters.id, clusterKey: articleClusters.clusterKey });
      const clusterIds = new Map(clusterRows.map((cluster) => [cluster.clusterKey, cluster.id]));
      const fallbackMemberships = fallbackPlans.flatMap((plan) => {
        const group = fallbackGroups.find((items) => clusterKey(items) === plan.key) ?? [];
        return group.flatMap((item) => item.externalId ? [{ clusterId: clusterIds.get(plan.key)!, articleId: item.externalId }] : []);
      });
      if (fallbackMemberships.length) await db.insert(articleClusterMembers).values(fallbackMemberships).onConflictDoNothing();
      const candidateValues = fallbackPlans.flatMap((plan) => plan.candidates.map((candidate) => ({ clusterId: clusterIds.get(plan.key)!, answer: candidate.answer, normalizedAnswer: candidate.normalizedAnswer, question: candidate.question, hint: candidate.hints[0], hints: candidate.hints, explanation: candidate.explanation, difficulty: "MEDIUM", confidence: 80, evidence: candidate.evidence, status: "VALIDATED" as const, promptVersion: NEWS_QUIZ_PROMPT_VERSION })));
      if (candidateValues.length) await db.insert(quizCandidates).values(candidateValues).onConflictDoNothing();
      generated += candidateValues.length;
    }
  }
  await db.update(workflowRuns).set({ currentStep: "GENERATE_PUZZLES", details: { sources: sources.length, discovered, generated, failed } }).where(eq(workflowRuns.id, run.id));
  const dailyCandidates = await db.select().from(quizCandidates)
    .where(and(gte(quizCandidates.createdAt, dayStart), eq(quizCandidates.promptVersion, NEWS_QUIZ_PROMPT_VERSION)))
    .orderBy(sql`${quizCandidates.confidence} desc`)
    .limit(300);
  if (dailyCandidates.length < 24) throw new Error(`Only ${dailyCandidates.length} daily candidates are available`);
  {
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
    const publishedAt = new Date();
    await db.insert(puzzles).values(dailyBoards.map((board, index) => {
      const sequenceNumber = index + 1;
      return {
        editionDate,
        category: `DAILY-${String(sequenceNumber).padStart(2, "0")}`,
        sequenceNumber,
        width: board.width,
        height: board.height,
        seed: `${editionDate}:${NEWS_QUIZ_PROMPT_VERSION}:${sequenceNumber}`,
        grid: board,
        status: "PUBLISHED" as const,
        publishedAt,
      };
    })).onConflictDoUpdate({
      target: [puzzles.editionDate, puzzles.sequenceNumber],
      set: { width: sql`excluded.width`, height: sql`excluded.height`, grid: sql`excluded.grid`, seed: sql`excluded.seed`, category: sql`excluded.category`, status: "PUBLISHED", publishedAt },
    });
  }
  const details = { sources: sources.length, discovered, generated, failed };
  await db.update(workflowRuns).set({ status: failed ? "PARTIAL" : "SUCCEEDED", currentStep: "DONE", details, finishedAt: new Date() }).where(eq(workflowRuns.id, run.id));
  return details;
  } catch (error) {
    await db.update(workflowRuns).set({ status: "FAILED", currentStep: "FAILED", details: { error: error instanceof Error ? error.message : String(error) }, finishedAt: new Date() }).where(eq(workflowRuns.id, run.id));
    throw error;
  }
}
