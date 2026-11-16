import { describe, expect, it } from "vitest";
import { availablePuzzleHints, buildProgressiveHints, newsSearchUrl, normalizeCellValue, resolveEntryPositions } from "./client-logic";

describe("puzzle client logic", () => {
  it("keeps one completed Korean syllable", () => {
    expect(normalizeCellValue("ㅎ하한")).toBe("한");
    expect(normalizeCellValue("뉴")).toBe("뉴");
  });

  it("uses the last character for a single cell", () => {
    expect(normalizeCellValue("ABC")).toBe("C");
  });

  it("aligns a full answer while allowing entry into only empty crossing cells", () => {
    expect(resolveEntryPositions(6, 6, [0, 1, 3, 4, 5])).toEqual([0, 1, 2, 3, 4, 5]);
    expect(resolveEntryPositions(5, 6, [0, 1, 3, 4, 5])).toEqual([0, 1, 3, 4, 5]);
  });

  it("always exposes the complete answer at hint level five", () => {
    const hints = buildProgressiveHints("인공지능", ["어려운 힌트", "정답은 네 글자입니다.", "중간 힌트", "쉬운 힌트", "old"]);
    expect(hints).toHaveLength(5);
    expect(hints[0]).toContain("컴퓨터가 수행하도록 하는 기술");
    expect(hints[1]).toBe("첫 글자는 ‘인’입니다.");
    expect(hints[2]).toBe("초성은 ‘ㅇㄱㅈㄴ’입니다.");
    expect(hints[4]).toBe("정답은 ‘인공지능’입니다.");
  });

  it("replaces a repeated headline hint on existing puzzles", () => {
    const question = "“○○○○ 기술이 주목받는다” 기사 제목의 빈칸을 채우세요.";
    const repeated = "“○○○○ 기술이 주목받는다”라는 뉴스 맥락에서 핵심 대상이 되는 표현입니다.";
    const hints = buildProgressiveHints("반도체", [repeated], repeated, question);
    expect(hints[0]).toBeTruthy();
    expect(hints[0]).not.toContain("기술이 주목받는다");
    expect(hints[4]).toBe("정답은 ‘반도체’입니다.");
  });

  it("starts legacy puzzles at level one with an explanatory clue", () => {
    const hints = availablePuzzleHints({
      id: "legacy", answer: "소노", question: "“[프로농구] ○○ 89-83 DB” 기사 제목의 빈칸을 채우세요.",
    });
    expect(hints[0]).toMatchObject({ id: "legacy:1", level: 1 });
    expect(hints[0].text).toContain("앞에 나온 점수를 기록한 쪽");
    expect(hints[0].text).not.toContain("소노");
  });

  it("keeps all five levels and provides a news search when the original link is missing", () => {
    const word = { id: "legacy", answer: "소노", question: "“프로농구 ○○ 89-83 DB” 기사 제목의 빈칸을 채우세요." };
    expect(availablePuzzleHints(word).map(({ level }) => level)).toEqual([1, 2, 3, 4, 5]);
    expect(new URL(newsSearchUrl(word)).searchParams.get("q")).toBe("프로농구 89-83 DB");
  });
});
