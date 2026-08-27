export type Direction = "ACROSS" | "DOWN";
export interface PuzzleInput { id: string; answer: string; question: string; }
export interface PlacedWord extends PuzzleInput { row: number; col: number; direction: Direction; }
export interface PuzzleBoard { width: number; height: number; cells: (string | null)[][]; words: PlacedWord[]; intersections: number; }
