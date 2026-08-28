import { describe, expect, it } from "vitest";
import { generateBalancedPuzzle, generatePuzzle, isPuzzleConnected, validateCrosswordRules, validatePuzzle } from "./generator";

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
    const syllables = [..."가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고"];
    const inputs = Array.from({ length: 24 }, (_, index) => ({ id: `w${index}`, answer: `${syllables[index]}${syllables[index + 1]}`, question: `문제${index}` }));
    const puzzle = generateBalancedPuzzle(inputs);
    expect(puzzle.words.filter((word) => word.direction === "ACROSS")).toHaveLength(12);
    expect(puzzle.words.filter((word) => word.direction === "DOWN")).toHaveLength(12);
    expect(validatePuzzle(puzzle)).toBe(true);
    expect(isPuzzleConnected(puzzle)).toBe(true);
    expect(validateCrosswordRules(puzzle)).toBe(true);
  });
});
