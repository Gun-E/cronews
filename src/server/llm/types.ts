import type { ZodType } from "zod";

export type ProviderName = "gemini" | "groq" | "mock";

export interface GenerateRequest<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  idempotencyKey: string;
}

export interface GenerateResult<T> {
  data: T;
  provider: ProviderName;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmProvider {
  readonly name: ProviderName;
  generateStructured<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>>;
}
