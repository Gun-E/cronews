import { z } from "zod";

export const quizGenerationSchema = z.object({
  clusterSummary: z.string().min(20),
  category: z.enum(["POLITICS", "ECONOMY", "SOCIETY", "WORLD", "SCIENCE", "TECHNOLOGY", "CULTURE", "SPORTS"]),
  importanceScore: z.number().int().min(0).max(100),
  rejected: z.boolean(),
  rejectionReasons: z.array(z.string()),
  candidates: z.array(z.object({
    answer: z.string().min(2).max(8).regex(/^[가-힣A-Za-z0-9]+$/),
    normalizedAnswer: z.string().min(2).max(8),
    question: z.string().min(15),
    hints: z.array(z.string().min(5)).length(5),
    explanation: z.string().min(20),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    confidence: z.number().min(0).max(1),
    supportingArticleIds: z.array(z.string()).min(1),
    evidence: z.array(z.object({ articleId: z.string(), fact: z.string() })).min(1),
    safetyFlags: z.array(z.string()),
  })).max(5),
});

export type QuizGeneration = z.infer<typeof quizGenerationSchema>;
