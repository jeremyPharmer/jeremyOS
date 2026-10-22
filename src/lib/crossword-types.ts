/** Shared crossword pack types (kept separate to avoid circular imports). */

export type MiniCrosswordPuzzle = {
  id: string;
  /** Square rows; letters = solution, `#` = block. Length = grid size. */
  rows: string[];
  across: { num: number; clue: string }[];
  down: { num: number; clue: string }[];
};
