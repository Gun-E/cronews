import { describe, expect, it } from "vitest";
import { generatePuzzle, validatePuzzle } from "./generator";

describe("crossword generator", () => {
  it("places intersecting Korean answers without corrupting cells", () => {
    const puzzle = generatePuzzle([
      { id: "1", answer: "인공지능", question: "문제1" },
      { id: "2", answer: "지능정보", question: "문제2" },
      { id: "3", answer: "정보통신", question: "문제3" },
    ]);
    expect(puzzle.words.length).toBeGreaterThanOrEqual(2);
    expect(puzzle.intersections).toBeGreaterThan(0);
    expect(validatePuzzle(puzzle)).toBe(true);
  });
});
