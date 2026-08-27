import { configuredProviders } from "./factory";
import { generateWithFallback } from "./fallback";
import { buildNewsQuizPrompt, NEWS_QUIZ_SYSTEM } from "./news-prompt";
import { quizGenerationSchema } from "./news-schema";
import type { FeedArticle } from "@/server/ingestion/types";

export async function generateNewsQuiz(clusterId: string, articles: FeedArticle[]) {
  const providers = configuredProviders();
  if (!providers.length) throw new Error("No LLM provider is configured");
  const safeArticles = articles.slice(0, 5).map((article, index) => ({
    id: article.externalId ?? `${clusterId}:${index}`,
    title: article.title.slice(0, 300),
    summary: article.summary?.slice(0, 1500),
    publishedAt: article.publishedAt?.toISOString(),
    url: article.url,
  }));
  return generateWithFallback({
    system: NEWS_QUIZ_SYSTEM,
    prompt: buildNewsQuizPrompt(safeArticles),
    schema: quizGenerationSchema,
    idempotencyKey: `quiz:${clusterId}`,
  }, providers);
}
