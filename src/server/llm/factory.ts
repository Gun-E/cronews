import { GeminiProvider } from "./gemini-provider";
import { GroqProvider } from "./groq-provider";
import type { LlmProvider, ProviderName } from "./types";

function create(name: ProviderName): LlmProvider | undefined {
  if (name === "gemini" && process.env.GEMINI_API_KEY) return new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL);
  if (name === "groq" && process.env.GROQ_API_KEY) return new GroqProvider(process.env.GROQ_API_KEY, process.env.GROQ_MODEL);
  return undefined;
}

export function configuredProviders(): LlmProvider[] {
  const primary = (process.env.LLM_PRIMARY_PROVIDER ?? "gemini") as ProviderName;
  const fallback = (process.env.LLM_FALLBACK_PROVIDER ?? "groq") as ProviderName;
  return [create(primary), create(fallback)].filter((provider): provider is LlmProvider => Boolean(provider));
}
