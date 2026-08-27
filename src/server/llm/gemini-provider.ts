import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRequest, GenerateResult, LlmProvider } from "./types";

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini" as const;
  constructor(private readonly apiKey: string, private readonly modelName = "gemini-2.5-flash") {}

  async generateStructured<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const model = new GoogleGenerativeAI(this.apiKey).getGenerativeModel({
      model: this.modelName,
      systemInstruction: request.system,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });
    const response = await model.generateContent(request.prompt);
    const data = request.schema.parse(JSON.parse(response.response.text()));
    return { data, provider: this.name, model: this.modelName };
  }
}
