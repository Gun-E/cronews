import { describe, expect, it } from "vitest";
import { buildProgressiveHints, normalizeCellValue } from "./client-logic";

describe("puzzle client logic", () => {
  it("keeps one completed Korean syllable", () => {
    expect(normalizeCellValue("ㅎ하한")).toBe("한");
    expect(normalizeCellValue("뉴")).toBe("뉴");
  });

  it("uses the last character for a single cell", () => {
    expect(normalizeCellValue("ABC")).toBe("C");
  });

  it("always exposes the complete answer at hint level five", () => {
    const hints = buildProgressiveHints("인공지능", ["어려운 힌트", "정답은 네 글자입니다.", "중간 힌트", "쉬운 힌트", "old"]);
    expect(hints).toHaveLength(5);
    expect(hints.some((hint) => hint.includes("글자"))).toBe(false);
    expect(hints[4]).toBe("정답은 ‘인공지능’입니다.");
  });
});
