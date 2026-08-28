export type Direction = "ACROSS" | "DOWN";
export interface PuzzleSource { title: string; url: string; publisher?: string; }
export interface PuzzleInput { id: string; answer: string; question: string; hint?: string; hints?: string[]; explanation?: string; sources?: PuzzleSource[]; }
export interface PlacedWord extends PuzzleInput { row: number; col: number; direction: Direction; }
export interface PuzzleBoard { width: number; height: number; cells: (string | null)[][]; words: PlacedWord[]; intersections: number; }
