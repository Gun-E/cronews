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

export function generateBalancedPuzzle(inputs: PuzzleInput[], pairCount = 12): PuzzleBoard {
  const normalized = inputs.map((input) => ({ ...input, answer: normalizeAnswer(input.answer) }))
    .filter((input) => /^[가-힣A-Z0-9]{2,8}$/.test(input.answer));
  if (normalized.length < pairCount * 2) throw new Error("Not enough words for a balanced puzzle");
  const size = 61;
  const board = emptyBoard(size);
  const hash = (value: string) => [...value].reduce((result, character) => Math.imul(result ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const layoutSeed = hash(normalized.slice(0, 8).map((word) => word.id).join(":"));
  const layoutStyle = layoutSeed % 4;
  const degreeById = new Map(normalized.map((word) => [word.id, normalized.reduce((count, other) => count + (other.id !== word.id && [...word.answer].some((character) => other.answer.includes(character)) ? 1 : 0), 0)]));
  const first = normalized[0];
  place(board, first, Math.floor(size / 2), Math.floor((size - first.answer.length) / 2), "ACROSS", 0);
  const clone = (source: PuzzleBoard): PuzzleBoard => ({ ...source, cells: source.cells.map((row) => [...row]), words: source.words.map((word) => ({ ...word })) });
  let visitedNodes = 0;
  const maxNodes = 20_000;
  const targetWords = pairCount * 2;
  const search = (current: PuzzleBoard, unused: PuzzleInput[]): PuzzleBoard | null => {
    if (current.words.length === targetWords) return current;
    if (++visitedNodes > maxNodes) return null;
    const acrossCount = current.words.filter((word) => word.direction === "ACROSS").length;
    const downCount = current.words.length - acrossCount;
    const target: Direction = acrossCount >= pairCount ? "DOWN"
      : downCount >= pairCount ? "ACROSS"
        : acrossCount === downCount ? ((layoutSeed + current.words.length) % 2 ? "ACROSS" : "DOWN")
          : acrossCount > downCount ? "DOWN" : "ACROSS";
    const anchors = current.words.filter((word) => word.direction !== target);
    const occupied = current.cells.flatMap((cells, row) => cells.map((cell, col) => cell ? { row, col } : null).filter(Boolean)) as { row: number; col: number }[];
    const currentBounds = {
      minRow: Math.min(...occupied.map((cell) => cell.row)), maxRow: Math.max(...occupied.map((cell) => cell.row)),
      minCol: Math.min(...occupied.map((cell) => cell.col)), maxCol: Math.max(...occupied.map((cell) => cell.col)),
    };
    const occupiedKeys = new Set(occupied.map((cell) => `${cell.row}:${cell.col}`));
    const currentSums = occupied.reduce<{ row: number; col: number; rowCol: number }>((sums, cell) => ({
      row: sums.row + cell.row, col: sums.col + cell.col, rowCol: sums.rowCol + cell.row * cell.col,
    }), { row: 0, col: 0, rowCol: 0 });
    const placements: { input: PuzzleInput; row: number; col: number; crossings: number; score: number }[] = [];
    const placementKeys = new Set<string>();
    for (const input of unused) {
      const futureMatches = degreeById.get(input.id) ?? 0;
      for (const anchor of anchors) for (let candidateIndex = 0; candidateIndex < input.answer.length; candidateIndex++) {
        for (let existingIndex = 0; existingIndex < anchor.answer.length; existingIndex++) {
            if (input.answer[candidateIndex] !== anchor.answer[existingIndex]) continue;
            const row = target === "DOWN" ? anchor.row - candidateIndex : anchor.row + existingIndex;
            const col = target === "DOWN" ? anchor.col + existingIndex : anchor.col - candidateIndex;
            const crossings = canPlace(current, input.answer, row, col, target);
            if (crossings < 1) continue;
            const key = `${input.id}:${row}:${col}:${target}`;
            if (placementKeys.has(key)) continue;
            placementKeys.add(key);
            const endRow = row + (target === "DOWN" ? input.answer.length - 1 : 0);
            const endCol = col + (target === "ACROSS" ? input.answer.length - 1 : 0);
            const centerDistance = Math.abs((row + endRow) / 2 - size / 2) + Math.abs((col + endCol) / 2 - size / 2);
            const minRow = Math.min(currentBounds.minRow, row), maxRow = Math.max(currentBounds.maxRow, endRow);
            const minCol = Math.min(currentBounds.minCol, col), maxCol = Math.max(currentBounds.maxCol, endCol);
            const verticalImbalance = Math.abs((size / 2 - minRow) - (maxRow - size / 2));
            const horizontalImbalance = Math.abs((size / 2 - minCol) - (maxCol - size / 2));
            const width = maxCol - minCol + 1, height = maxRow - minRow + 1;
            const aspectBias = layoutStyle === 0 ? -Math.abs(width - height) * 9
              : layoutStyle === 1 ? (width - height) * 4
                : layoutStyle === 2 ? (height - width) * 4
                  : -Math.abs(width - height) * 3;
            const addedCells = Array.from({ length: input.answer.length }, (_, index) => ({
              row: row + (target === "DOWN" ? index : 0), col: col + (target === "ACROSS" ? index : 0),
            })).filter((cell) => !occupiedKeys.has(`${cell.row}:${cell.col}`));
            const count = occupied.length + addedCells.length;
            const sums = addedCells.reduce<{ row: number; col: number; rowCol: number }>((result, cell) => ({
              row: result.row + cell.row, col: result.col + cell.col, rowCol: result.rowCol + cell.row * cell.col,
            }), currentSums);
            const diagonalCovariance = Math.abs(sums.rowCol / count - (sums.row / count) * (sums.col / count));
            const jitter = hash(`${layoutSeed}:${current.words.length}:${input.id}:${row}:${col}`) % 120;
            const score = crossings * 1_150 + futureMatches * 4 - centerDistance * 9
              - (verticalImbalance + horizontalImbalance) * 28 - diagonalCovariance * 34 + aspectBias + jitter;
            placements.push({ input, row, col, crossings, score });
        }
      }
    }
    placements.sort((a, b) => b.score - a.score);
    for (const candidate of placements.slice(0, 140)) {
      const next = clone(current);
      place(next, candidate.input, candidate.row, candidate.col, target, candidate.crossings);
      if (!validateCrosswordRules(next)) continue;
      const solved = search(next, unused.filter((word) => word.id !== candidate.input.id));
      if (solved) return solved;
    }
    return null;
  };
  const solved = search(board, normalized.slice(1));
  if (!solved) throw new Error(`DFS could not build a ${pairCount}/${pairCount} crossword after ${visitedNodes} nodes`);
  const occupied = solved.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => cell ? { row: rowIndex, col: colIndex } : null).filter(Boolean)) as { row: number; col: number }[];
  const minRow = Math.min(...occupied.map((cell) => cell.row)), maxRow = Math.max(...occupied.map((cell) => cell.row));
  const minCol = Math.min(...occupied.map((cell) => cell.col)), maxCol = Math.max(...occupied.map((cell) => cell.col));
  return {
    ...solved,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
    cells: solved.cells.slice(minRow, maxRow + 1).map((row) => row.slice(minCol, maxCol + 1)),
    words: solved.words.map((word) => ({ ...word, row: word.row - minRow, col: word.col - minCol })),
  };
}

export function validatePuzzle(board: PuzzleBoard): boolean {
  return board.words.every((word) => {
    const [dr, dc] = delta(word.direction);
    return [...word.answer].every((char, index) => board.cells[word.row + dr * index]?.[word.col + dc * index] === char);
  });
}

export function crosswordDiagonalBias(board: PuzzleBoard): number {
  const occupied = board.cells.flatMap((cells, row) => cells.map((cell, col) => cell ? { row, col } : null).filter(Boolean)) as { row: number; col: number }[];
  if (occupied.length < 2) return 0;
  const meanRow = occupied.reduce((sum, cell) => sum + cell.row, 0) / occupied.length;
  const meanCol = occupied.reduce((sum, cell) => sum + cell.col, 0) / occupied.length;
  const covariance = occupied.reduce((sum, cell) => sum + (cell.row - meanRow) * (cell.col - meanCol), 0);
  const rowVariance = occupied.reduce((sum, cell) => sum + (cell.row - meanRow) ** 2, 0);
  const colVariance = occupied.reduce((sum, cell) => sum + (cell.col - meanCol) ** 2, 0);
  return rowVariance && colVariance ? Math.abs(covariance / Math.sqrt(rowVariance * colVariance)) : 0;
}

export function isPuzzleConnected(board: PuzzleBoard): boolean {
  if (!board.words.length) return false;
  const cellsByWord = new Map(board.words.map((word) => [word.id, new Set([...word.answer].map((_, index) => `${word.row + (word.direction === "DOWN" ? index : 0)}:${word.col + (word.direction === "ACROSS" ? index : 0)}`))]));
  const visited = new Set<string>([board.words[0].id]);
  const queue = [board.words[0].id];
  while (queue.length) {
    const current = cellsByWord.get(queue.shift()!)!;
    for (const [wordId, cells] of cellsByWord) {
      if (visited.has(wordId)) continue;
      if ([...cells].some((cell) => current.has(cell))) { visited.add(wordId); queue.push(wordId); }
    }
  }
  return visited.size === board.words.length;
}

export function validateCrosswordRules(board: PuzzleBoard): boolean {
  if (!validatePuzzle(board) || !isPuzzleConnected(board)) return false;
  const owners = new Map<string, PlacedWord[]>();
  for (const word of board.words) for (let index = 0; index < word.answer.length; index++) {
    const row = word.row + (word.direction === "DOWN" ? index : 0), col = word.col + (word.direction === "ACROSS" ? index : 0);
    const key = `${row}:${col}`;
    owners.set(key, [...(owners.get(key) ?? []), word]);
  }
  for (const word of board.words) {
    const [dr, dc] = delta(word.direction);
    const endRow = word.row + dr * (word.answer.length - 1), endCol = word.col + dc * (word.answer.length - 1);
    if (board.cells[word.row - dr]?.[word.col - dc] || board.cells[endRow + dr]?.[endCol + dc]) return false;
    for (let index = 0; index < word.answer.length; index++) {
      const row = word.row + dr * index, col = word.col + dc * index;
      const cellOwners = owners.get(`${row}:${col}`) ?? [];
      if (new Set(cellOwners.map((owner) => owner.direction)).size !== cellOwners.length) return false;
      if (cellOwners.length > 1) continue;
      const sideA = word.direction === "ACROSS" ? board.cells[row - 1]?.[col] : board.cells[row]?.[col - 1];
      const sideB = word.direction === "ACROSS" ? board.cells[row + 1]?.[col] : board.cells[row]?.[col + 1];
      if (sideA || sideB) return false;
    }
  }
  return true;
}
