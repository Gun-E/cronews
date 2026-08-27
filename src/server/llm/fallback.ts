import type { GenerateRequest, GenerateResult, LlmProvider } from "./types";

export async function generateWithFallback<T>(
  request: GenerateRequest<T>,
  providers: readonly LlmProvider[],
): Promise<GenerateResult<T>> {
  const errors: Error[] = [];
  for (const provider of providers) {
    try {
      return await provider.generateStructured(request);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  throw new AggregateError(errors, "All LLM providers failed");
}
