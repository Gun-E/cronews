import { createHash } from "node:crypto";
import { normalizeTitle } from "./normalize";
import type { FeedArticle } from "./types";

const STOPWORDS = new Set(["기자", "관련", "대한", "통해", "위해", "오늘", "정부", "발표", "단독", "속보", "종합", "뉴스", "공식"]);

function tokens(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token)));
}

function ngrams(value: string, size = 2): Set<string> {
  const normalized = normalizeTitle(value).replace(/\s/g, "");
  return new Set(Array.from({ length: Math.max(0, normalized.length - size + 1) }, (_, index) => normalized.slice(index, index + size)));
}

function setSimilarity(left: Set<string>, right: Set<string>): { jaccard: number; containment: number } {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return {
    jaccard: union ? intersection / union : 0,
    containment: Math.min(left.size, right.size) ? intersection / Math.min(left.size, right.size) : 0,
  };
}

export function titleSimilarity(a: string, b: string): number {
  const words = setSimilarity(tokens(a), tokens(b));
  const characters = setSimilarity(ngrams(a), ngrams(b));
  return Math.max(words.jaccard, words.containment * 0.82 + characters.jaccard * 0.18, characters.jaccard * 0.9);
}

export function articleSimilarity(a: FeedArticle, b: FeedArticle): number {
  const titleScore = titleSimilarity(a.title, b.title);
  if (!a.summary || !b.summary) return titleScore;
  const summaries = setSimilarity(tokens(a.summary), tokens(b.summary));
  return Math.max(titleScore, titleScore * 0.72 + summaries.containment * 0.28);
}

export function clusterArticles(articles: FeedArticle[], threshold = 0.32): FeedArticle[][] {
  const clusters: FeedArticle[][] = [];
  for (const article of articles) {
    let best: FeedArticle[] | undefined, bestScore = 0;
    for (const cluster of clusters) {
      const score = Math.max(...cluster.map((member) => articleSimilarity(article, member)));
      if (score >= threshold && score > bestScore) { best = cluster; bestScore = score; }
    }
    (best ?? clusters[clusters.push([]) - 1]).push(article);
  }
  return clusters;
}

export function clusterKey(articles: FeedArticle[]): string {
  const value = articles.map((article) => normalizeTitle(article.title)).sort().join("|");
  return createHash("sha256").update(value).digest("hex");
}
