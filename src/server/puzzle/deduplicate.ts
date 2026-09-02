import type { PuzzleInput } from "./types";

const QUESTION_STOP_WORDS = new Set(["관련", "대한", "위한", "오늘", "정부", "한국", "발표", "기자", "뉴스", "단독", "종합", "논란"]);

function normalizedQuestionTokens(question: string): Set<string> {
  return new Set(question.normalize("NFC").toUpperCase().replace(/[○□“”'\"‘’.,!?()[\]]/g, " ").split(/\s+/).filter((token) => token.length > 1 && !QUESTION_STOP_WORDS.has(token)));
}

export function questionsAreSimilar(left: string, right: string): boolean {
  const a = normalizedQuestionTokens(left), b = normalizedQuestionTokens(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const smaller = Math.min(a.size, b.size);
  return smaller > 0 && intersection / smaller >= 0.72;
}

export function deduplicatePuzzleInputs(inputs: PuzzleInput[]): PuzzleInput[] {
  const accepted: PuzzleInput[] = [];
  const answers = new Set<string>();
  for (const input of inputs) {
    const answer = input.answer.normalize("NFC").replace(/\s/g, "").toUpperCase();
    if (answers.has(answer) || accepted.some((item) => questionsAreSimilar(item.question, input.question))) continue;
    answers.add(answer);
    accepted.push(input);
  }
  return accepted;
}
