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

function centeredIntersection(a: string, b: string, moduleSize: number) {
  const center = Math.floor(moduleSize / 2);
  for (let ai = 0; ai < a.length; ai++) for (let bi = 0; bi < b.length; bi++) {
    if (a[ai] !== b[bi]) continue;
    if (center - ai < 0 || center - bi < 0) continue;
    if (center - ai + a.length > moduleSize || center - bi + b.length > moduleSize) continue;
    return { ai, bi };
  }
  return null;
}

export function generateBalancedPuzzle(inputs: PuzzleInput[], pairCount = 12): PuzzleBoard {
  const normalized = inputs.map((input) => ({ ...input, answer: normalizeAnswer(input.answer) }))
    .filter((input) => /^[가-힣A-Z0-9]{2,8}$/.test(input.answer));
  const used = new Set<string>();
  const pairs: { across: PuzzleInput; down: PuzzleInput; ai: number; bi: number }[] = [];
  const moduleSize = 11;
  for (let i = 0; i < normalized.length && pairs.length < pairCount; i++) {
    if (used.has(normalized[i].id)) continue;
    for (let j = i + 1; j < normalized.length; j++) {
      if (used.has(normalized[j].id)) continue;
      const crossing = centeredIntersection(normalized[i].answer, normalized[j].answer, moduleSize);
      if (!crossing) continue;
      pairs.push({ across: normalized[i], down: normalized[j], ...crossing });
      used.add(normalized[i].id); used.add(normalized[j].id);
      break;
    }
  }
  if (pairs.length < pairCount) throw new Error(`Balanced puzzle requires ${pairCount * 2} intersecting words; found ${pairs.length * 2}`);
  const modulesPerRow = 2;
  const rows = Math.ceil(pairCount / modulesPerRow);
  const board = emptyBoard(moduleSize * Math.max(1, Math.min(modulesPerRow, pairCount)));
  board.height = moduleSize * rows;
  board.cells = Array.from({ length: board.height }, () => Array<string | null>(board.width).fill(null));
  const center = Math.floor(moduleSize / 2);
  pairs.forEach((pair, index) => {
    const baseRow = Math.floor(index / modulesPerRow) * moduleSize;
    const baseCol = (index % modulesPerRow) * moduleSize;
    place(board, pair.across, baseRow + center, baseCol + center - pair.ai, "ACROSS", 0);
    place(board, pair.down, baseRow + center - pair.bi, baseCol + center, "DOWN", 1);
  });
  return board;
}

export function validatePuzzle(board: PuzzleBoard): boolean {
  return board.words.every((word) => {
    const [dr, dc] = delta(word.direction);
    return [...word.answer].every((char, index) => board.cells[word.row + dr * index]?.[word.col + dc * index] === char);
  });
}
