import { createHash } from "node:crypto";
import { normalizeTitle } from "./normalize";
import type { FeedArticle } from "./types";

const STOPWORDS = new Set(["기자", "관련", "대한", "통해", "위해", "오늘", "정부", "발표"]);

function tokens(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token)));
}

export function titleSimilarity(a: string, b: string): number {
  const left = tokens(a), right = tokens(b);
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function clusterArticles(articles: FeedArticle[], threshold = 0.28): FeedArticle[][] {
  const clusters: FeedArticle[][] = [];
  for (const article of articles) {
    let best: FeedArticle[] | undefined, bestScore = 0;
    for (const cluster of clusters) {
      const score = Math.max(...cluster.map((member) => titleSimilarity(article.title, member.title)));
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
