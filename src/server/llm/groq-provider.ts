import OpenAI from "openai";
import type { GenerateRequest, GenerateResult, LlmProvider } from "./types";

export class GroqProvider implements LlmProvider {
  readonly name = "groq" as const;
  constructor(private readonly apiKey: string, private readonly modelName = "qwen/qwen3.6-27b") {}

  async generateStructured<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const client = new OpenAI({ apiKey: this.apiKey, baseURL: "https://api.groq.com/openai/v1" });
    const response = await client.chat.completions.create({
      model: this.modelName,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: request.system }, { role: "user", content: request.prompt }],
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Groq returned an empty response");
    const data = request.schema.parse(JSON.parse(content));
    return { data, provider: this.name, model: this.modelName, inputTokens: response.usage?.prompt_tokens, outputTokens: response.usage?.completion_tokens };
  }
}
