import type { Direction, PlacedWord, PuzzleBoard, PuzzleInput } from "./types";

const normalizeAnswer = (value: string) => value.normalize("NFC").replace(/\s/g, "").toUpperCase();
const delta = (direction: Direction) => direction === "ACROSS" ? [0, 1] as const : [1, 0] as const;

function emptyBoard(size: number): PuzzleBoard {
  return { width: size, height: size, cells: Array.from({ length: size }, () => Array<string | null>(size).fill(null)), words: [], intersections: 0 };
}

function canPlace(board: PuzzleBoard, answer: string, row: number, col: number, direction: Direction): number {
  const [dr, dc] = delta(direction);
  const endRow = row + dr * (answer.length - 1), endCol = col + dc * (answer.length - 1);
  if (row < 0 || col < 0 || endRow >= board.height || endCol >= board.width) return -1;
  const before = board.cells[row - dr]?.[col - dc], after = board.cells[endRow + dr]?.[endCol + dc];
  if (before || after) return -1;
  let crossings = 0;
  for (let i = 0; i < answer.length; i++) {
    const r = row + dr * i, c = col + dc * i, existing = board.cells[r][c];
    if (existing && existing !== answer[i]) return -1;
    if (existing === answer[i]) crossings++;
    if (!existing) {
      const sideA = direction === "ACROSS" ? board.cells[r - 1]?.[c] : board.cells[r]?.[c - 1];
      const sideB = direction === "ACROSS" ? board.cells[r + 1]?.[c] : board.cells[r]?.[c + 1];
      if (sideA || sideB) return -1;
    }
  }
  return crossings;
}

function place(board: PuzzleBoard, input: PuzzleInput, row: number, col: number, direction: Direction, crossings: number) {
  const answer = normalizeAnswer(input.answer), [dr, dc] = delta(direction);
  for (let i = 0; i < answer.length; i++) board.cells[row + dr * i][col + dc * i] = answer[i];
  board.words.push({ ...input, answer, row, col, direction });
  board.intersections += crossings;
}

export function generatePuzzle(inputs: PuzzleInput[], size = 11): PuzzleBoard {
  const words = inputs.map((word) => ({ ...word, answer: normalizeAnswer(word.answer) })).filter((word) => /^[가-힣A-Z0-9]{2,8}$/.test(word.answer)).sort((a, b) => b.answer.length - a.answer.length);
  if (!words.length) throw new Error("No valid puzzle words");
  const board = emptyBoard(size), first = words.shift()!;
  place(board, first, Math.floor(size / 2), Math.floor((size - first.answer.length) / 2), "ACROSS", 0);
  for (const input of words) {
    let best: { row: number; col: number; direction: Direction; crossings: number } | undefined;
    for (const existing of board.words) {
      for (let a = 0; a < input.answer.length; a++) for (let b = 0; b < existing.answer.length; b++) {
        if (input.answer[a] !== existing.answer[b]) continue;
        const direction: Direction = existing.direction === "ACROSS" ? "DOWN" : "ACROSS";
        const row = existing.direction === "ACROSS" ? existing.row - a : existing.row + b;
        const col = existing.direction === "ACROSS" ? existing.col + b : existing.col - a;
        const crossings = canPlace(board, input.answer, row, col, direction);
        if (crossings > (best?.crossings ?? 0)) best = { row, col, direction, crossings };
      }
    }
    if (best) place(board, input, best.row, best.col, best.direction, best.crossings);
  }
  return board;
}

export function validatePuzzle(board: PuzzleBoard): boolean {
  return board.words.every((word) => {
    const [dr, dc] = delta(word.direction);
    return [...word.answer].every((char, index) => board.cells[word.row + dr * index]?.[word.col + dc * index] === char);
  });
}
