import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateWithFallback } from "./fallback";
import type { LlmProvider } from "./types";

describe("generateWithFallback", () => {
  it("uses the next provider after a failure", async () => {
    const failed: LlmProvider = { name: "gemini", generateStructured: async () => { throw new Error("rate limited"); } };
    const backup: LlmProvider = {
      name: "groq",
      generateStructured: async <T>() => ({ data: { ok: true } as T, provider: "groq", model: "test" }),
    };
    const result = await generateWithFallback({ system: "", prompt: "", schema: z.object({ ok: z.boolean() }), idempotencyKey: "x" }, [failed, backup]);
    expect(result.provider).toBe("groq");
  });
});
