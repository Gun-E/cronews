import { describe, expect, it } from "vitest";
import { generateBalancedPuzzle, generatePuzzle, validatePuzzle } from "./generator";

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

  it("guarantees twelve across and twelve down clues", () => {
    const inputs = Array.from({ length: 12 }, (_, index) => [
      { id: `a${index}`, answer: `가${String.fromCharCode(65 + index)}나`, question: `가로${index}` },
      { id: `d${index}`, answer: `다${String.fromCharCode(65 + index)}가`, question: `세로${index}` },
    ]).flat();
    const puzzle = generateBalancedPuzzle(inputs);
    expect(puzzle.words.filter((word) => word.direction === "ACROSS")).toHaveLength(12);
    expect(puzzle.words.filter((word) => word.direction === "DOWN")).toHaveLength(12);
    expect(validatePuzzle(puzzle)).toBe(true);
  });
});
