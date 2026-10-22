import type { RebuildState } from "./types";
import type { MiniCrosswordPuzzle } from "./crossword-types";
import { MINI_CROSSWORDS as MINI_CROSSWORDS_PACK } from "./mini-crosswords";

export type { MiniCrosswordPuzzle } from "./crossword-types";

/** Default / legacy mini size. Prefer `puzzleSize(puzzle)`. */
export const CROSSWORD_SIZE = 5;

/** Side length of a square puzzle. */
export function puzzleSize(puzzle: MiniCrosswordPuzzle): number {
  return puzzle.rows.length;
}

export type CrosswordCell = {
  row: number;
  col: number;
  index: number;
  black: boolean;
  number?: number;
  solution: string;
};

export type CrosswordDayProgress = {
  date: string;
  started: boolean;
  solved: boolean;
  /** Gave up via Solve — answers shown; grid locked; not a win */
  revealed?: boolean;
  /** Length `size²`; `""` empty, letter, or `"#"` for black */
  cells: string[];
};

export type DailyCrosswordState = {
  attempts: number;
  completed: number;
  current?: CrosswordDayProgress;
};

/**
 * Hand-authored + generated pack — classic and ladder 5×5 shapes.
 * Answer words and clue text stay unique across the whole pack (≥366 for year coverage).
 * Rotate by day-of-year so the same clue is not reused within a calendar year.
 */
export const MINI_CROSSWORDS: MiniCrosswordPuzzle[] = MINI_CROSSWORDS_PACK;


function dayOfYear(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  const now = Date.UTC(y, m - 1, d);
  return Math.floor((now - start) / 86_400_000);
}

/** One-off calendar pins (standalone puzzles — not also in the rotating pack). */
const PINNED_2026_09_19: MiniCrosswordPuzzle = {
  id: "inter-coast",
  rows: ["INTER", "N#E#A", "COAST", "U#M#E", "RISKS"],
  across: [
    { num: 1, clue: "Burial, old-style" },
    { num: 4, clue: "Shoreline" },
    { num: 5, clue: "Takes chances" },
  ],
  down: [
    { num: 1, clue: "Bring upon oneself" },
    { num: 2, clue: "League sides" },
    { num: 3, clue: "Hotel prices" },
  ],
};

/** Pin a puzzle to a calendar day without reshuffling the pack. */
const DATE_PUZZLES: Record<string, MiniCrosswordPuzzle> = {
  // Keep 2026-09-19 on the pre-ladder-mix puzzle; new pack rotation from 2026-09-20.
  "2026-09-19": PINNED_2026_09_19,
};

export function puzzleForDate(date: string): MiniCrosswordPuzzle {
  const pinned = DATE_PUZZLES[date];
  if (pinned) return pinned;
  const pack = MINI_CROSSWORDS;
  // 0-based day-of-year so a pack of ≥366 yields a unique puzzle each day of the year.
  const idx = (((dayOfYear(date) - 1) % pack.length) + pack.length) % pack.length;
  return pack[idx]!;
}

export function emptyCellsForPuzzle(puzzle: MiniCrosswordPuzzle): string[] {
  const cells: string[] = [];
  for (const row of puzzle.rows) {
    for (const ch of row) {
      cells.push(ch === "#" ? "#" : "");
    }
  }
  return cells;
}

/** Reading-order start numbers for cells that begin an across and/or down. */
export function startNumberMap(
  puzzle: MiniCrosswordPuzzle,
): Map<number, number> {
  const size = puzzleSize(puzzle);
  const map = new Map<number, number>();
  let next = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzle.rows[r]![c] === "#") continue;
      const isAcross =
        (c === 0 || puzzle.rows[r]![c - 1] === "#") &&
        c + 1 < size &&
        puzzle.rows[r]![c + 1] !== "#";
      const isDown =
        (r === 0 || puzzle.rows[r - 1]![c] === "#") &&
        r + 1 < size &&
        puzzle.rows[r + 1]![c] !== "#";
      if (!isAcross && !isDown) continue;
      map.set(r * size + c, next);
      next += 1;
    }
  }
  return map;
}

export function buildGrid(puzzle: MiniCrosswordPuzzle): CrosswordCell[] {
  const size = puzzleSize(puzzle);
  const starts = startNumberMap(puzzle);
  const cells: CrosswordCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const ch = puzzle.rows[row]![col]!;
      cells.push({
        row,
        col,
        index,
        black: ch === "#",
        number: starts.get(index),
        solution: ch === "#" ? "#" : ch.toUpperCase(),
      });
    }
  }
  return cells;
}

export function clueStartIndex(
  puzzle: MiniCrosswordPuzzle,
  num: number,
): number | null {
  for (const [index, n] of startNumberMap(puzzle)) {
    if (n === num) return index;
  }
  return null;
}

export function answerAt(
  puzzle: MiniCrosswordPuzzle,
  num: number,
  dir: "across" | "down",
): string {
  const size = puzzleSize(puzzle);
  const start = clueStartIndex(puzzle, num);
  if (start == null) return "";
  const row = Math.floor(start / size);
  const col = start % size;
  let out = "";
  if (dir === "across") {
    for (let c = col; c < size; c++) {
      const ch = puzzle.rows[row]![c]!;
      if (ch === "#") break;
      out += ch;
    }
  } else {
    for (let r = row; r < size; r++) {
      const ch = puzzle.rows[r]![col]!;
      if (ch === "#") break;
      out += ch;
    }
  }
  return out.toUpperCase();
}

export function fillableCount(puzzle: MiniCrosswordPuzzle): number {
  let n = 0;
  for (const row of puzzle.rows) {
    for (const ch of row) if (ch !== "#") n += 1;
  }
  return n;
}

export function filledCount(cells: string[]): number {
  let n = 0;
  for (const ch of cells) {
    if (ch && ch !== "#") n += 1;
  }
  return n;
}

/** Today’s fill % — letters entered ÷ fillable (wrong letters still count). */
export function todayFillPercent(
  puzzle: MiniCrosswordPuzzle,
  cells: string[] | undefined,
): number {
  const total = fillableCount(puzzle);
  if (total === 0) return 0;
  if (!cells?.length) return 0;
  return Math.round((filledCount(cells) / total) * 100);
}

export function isGridSolved(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): boolean {
  const size = puzzleSize(puzzle);
  if (cells.length !== size * size) return false;
  for (let i = 0; i < cells.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    const sol = puzzle.rows[row]![col]!;
    if (sol === "#") continue;
    if ((cells[i] || "").toUpperCase() !== sol.toUpperCase()) return false;
  }
  return true;
}

/** Full solution grid (same shape as playable cells). */
export function solutionCells(puzzle: MiniCrosswordPuzzle): string[] {
  const cells: string[] = [];
  for (const row of puzzle.rows) {
    for (const ch of row) {
      cells.push(ch === "#" ? "#" : ch.toUpperCase());
    }
  }
  return cells;
}

export type CrosswordDir = "across" | "down";

export type CrosswordEntry = {
  num: number;
  dir: CrosswordDir;
  indexes: number[];
};

/** Indexes for one across or down entry starting at `num`. */
export function wordCellIndexes(
  puzzle: MiniCrosswordPuzzle,
  num: number,
  dir: CrosswordDir,
): number[] {
  const size = puzzleSize(puzzle);
  const start = clueStartIndex(puzzle, num);
  if (start == null) return [];
  const row = Math.floor(start / size);
  const col = start % size;
  const indexes: number[] = [];
  if (dir === "across") {
    for (let c = col; c < size; c++) {
      if (puzzle.rows[row]![c] === "#") break;
      indexes.push(row * size + c);
    }
  } else {
    for (let r = row; r < size; r++) {
      if (puzzle.rows[r]![col] === "#") break;
      indexes.push(r * size + col);
    }
  }
  return indexes;
}

/**
 * Across or down clue entry that owns `index` for the given direction.
 * Returns null when that cell isn’t part of a listed clue in `dir`.
 */
export function entryForCell(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
): CrosswordEntry | null {
  const clues = dir === "across" ? puzzle.across : puzzle.down;
  for (const c of clues) {
    const indexes = wordCellIndexes(puzzle, c.num, dir);
    if (indexes.includes(index)) {
      return { num: c.num, dir, indexes };
    }
  }
  return null;
}

/** Prefer `dir`, else the other direction, else null. */
export function entryForCellPrefer(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
): CrosswordEntry | null {
  return (
    entryForCell(puzzle, index, dir) ??
    entryForCell(puzzle, index, dir === "across" ? "down" : "across")
  );
}

export function entryHasLetters(
  cells: string[],
  indexes: number[],
): boolean {
  return indexes.some((i) => {
    const ch = cells[i];
    return Boolean(ch && ch !== "#");
  });
}

/**
 * True when the entry has at least one letter that Clear would remove
 * (ignores letters already locked by a fully correct crossing word).
 */
export function entryHasClearableLetters(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  indexes: number[],
): boolean {
  const keep = correctWordCellIndexes(puzzle, cells);
  return indexes.some((i) => {
    const ch = cells[i];
    return Boolean(ch && ch !== "#" && !keep.has(i));
  });
}

/**
 * Wipe letters for one clue entry.
 * Leaves black cells alone, and keeps letters already marked correct
 * via a completed across/down word (so Clear won’t trash a good cross).
 */
export function clearEntryCells(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  indexes: number[],
): string[] {
  const keep = correctWordCellIndexes(puzzle, cells);
  const next = [...cells];
  for (const i of indexes) {
    if (next[i] === "#") continue;
    if (keep.has(i)) continue;
    next[i] = "";
  }
  return next;
}

/** Next fillable cell along an across/down run, or null at the edge. */
export function nextCellInDirection(
  puzzle: MiniCrosswordPuzzle,
  index: number,
  dir: CrosswordDir,
  step: 1 | -1,
): number | null {
  const size = puzzleSize(puzzle);
  const row = Math.floor(index / size);
  const col = index % size;
  let r = row;
  let c = col;
  if (dir === "across") c += step;
  else r += step;
  if (r < 0 || r >= size || c < 0 || c >= size) {
    return null;
  }
  if (puzzle.rows[r]![c] === "#") return null;
  return r * size + c;
}

/**
 * Next white cell in Across/Down that is not already locked by a fully
 * correct crossing word — so typing skips those letters and continues.
 */
export function nextEditableCellInDirection(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  index: number,
  dir: CrosswordDir,
  step: 1 | -1,
): number | null {
  const locked = correctWordCellIndexes(puzzle, cells);
  let cur = index;
  // Bound the walk to the grid size so a fully-locked entry cannot loop.
  const size = puzzleSize(puzzle);
  for (let hops = 0; hops < size; hops++) {
    const n = nextCellInDirection(puzzle, cur, dir, step);
    if (n == null) return null;
    if (!locked.has(n)) return n;
    cur = n;
  }
  return null;
}

/** True when every letter of that entry is filled and matches the solution. */
export function isWordCorrect(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
  num: number,
  dir: CrosswordDir,
): boolean {
  const indexes = wordCellIndexes(puzzle, num, dir);
  if (indexes.length < 2) return false;
  const size = puzzleSize(puzzle);
  for (const i of indexes) {
    const row = Math.floor(i / size);
    const col = i % size;
    const sol = puzzle.rows[row]![col]!;
    const got = (cells[i] || "").toUpperCase();
    if (!got || got !== sol.toUpperCase()) return false;
  }
  return true;
}

/**
 * Cells that belong to at least one fully correct across/down word.
 * Used to flash “got it” feedback while the puzzle is still open.
 */
export function correctWordCellIndexes(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): Set<number> {
  const out = new Set<number>();
  for (const c of puzzle.across) {
    if (isWordCorrect(puzzle, cells, c.num, "across")) {
      for (const i of wordCellIndexes(puzzle, c.num, "across")) out.add(i);
    }
  }
  for (const c of puzzle.down) {
    if (isWordCorrect(puzzle, cells, c.num, "down")) {
      for (const i of wordCellIndexes(puzzle, c.num, "down")) out.add(i);
    }
  }
  return out;
}

/** Yesterday (or earlier) attempt that was started but never solved or revealed. */
export function isStaleUnfinishedCrossword(
  current: CrosswordDayProgress | undefined,
  today: string,
): boolean {
  return Boolean(
    current &&
      current.date !== today &&
      current.started &&
      !current.solved &&
      !current.revealed,
  );
}

export type MissedReview = {
  /** Player-correct letters kept; missed/wrong cells filled with the solution. */
  displayCells: string[];
  /** Indexes that were empty or wrong — shown in red in the review UI. */
  missedIndexes: Set<number>;
};

/**
 * Build a frozen end-of-day review: keep letters that were already right,
 * fill every miss with the solution letter so the player can see what they
 * left unfinished.
 */
export function missedReviewForPuzzle(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): MissedReview {
  const sol = solutionCells(puzzle);
  const displayCells = emptyCellsForPuzzle(puzzle);
  const missedIndexes = new Set<number>();
  for (let i = 0; i < sol.length; i++) {
    const want = sol[i]!;
    if (want === "#") {
      displayCells[i] = "#";
      continue;
    }
    const got = (cells[i] || "").toUpperCase();
    if (got === want) {
      displayCells[i] = got;
    } else {
      displayCells[i] = want;
      missedIndexes.add(i);
    }
  }
  return { displayCells, missedIndexes };
}

export function normalizeDailyCrossword(
  raw: DailyCrosswordState | undefined,
): DailyCrosswordState {
  return {
    attempts: Math.max(0, Math.floor(raw?.attempts ?? 0)),
    completed: Math.max(0, Math.floor(raw?.completed ?? 0)),
    current: raw?.current
      ? {
          date: raw.current.date,
          started: Boolean(raw.current.started),
          solved: Boolean(raw.current.solved),
          revealed: Boolean(raw.current.revealed),
          cells: Array.isArray(raw.current.cells)
            ? raw.current.cells.map((c) =>
                c === "#" ? "#" : String(c || "").toUpperCase().slice(0, 1),
              )
            : [],
        }
      : undefined,
  };
}

export function bannerText(
  completed: number,
  attempts: number,
): string {
  const safeCompleted = Math.max(0, Math.floor(completed));
  const safeAttempts = Math.max(0, Math.floor(attempts));
  const frac = `${safeCompleted}/${safeAttempts}`;
  if (safeAttempts <= 0) return `${frac} · —`;
  const rate = Math.round((safeCompleted / safeAttempts) * 100);
  return `${frac} · ${rate}%`;
}

export type CrosswordAction =
  | { action: "start"; date: string }
  | { action: "save"; date: string; cells: string[] }
  | { action: "complete"; date: string; cells?: string[] }
  | { action: "reveal"; date: string };

export function applyCrosswordAction(
  state: RebuildState,
  payload: CrosswordAction,
): RebuildState {
  const puzzle = puzzleForDate(payload.date);
  let dc = normalizeDailyCrossword(state.dailyCrossword);
  const expectedLen = puzzleSize(puzzle) * puzzleSize(puzzle);
  let sameDay = dc.current?.date === payload.date ? dc.current : undefined;
  // Pack/size can change for a date mid-day — drop incompatible fills.
  if (sameDay && sameDay.cells.length !== expectedLen) {
    sameDay = {
      ...sameDay,
      solved: false,
      revealed: false,
      cells: emptyCellsForPuzzle(puzzle),
    };
    dc = { ...dc, current: sameDay };
  }

  if (payload.action === "start") {
    if (sameDay?.started) {
      return { ...state, dailyCrossword: dc };
    }
    const next: DailyCrosswordState = {
      attempts: dc.attempts + 1,
      completed: dc.completed,
      current: {
        date: payload.date,
        started: true,
        solved: false,
        revealed: false,
        cells: emptyCellsForPuzzle(puzzle),
      },
    };
    return { ...state, dailyCrossword: next };
  }

  if (!sameDay?.started) {
    return { ...state, dailyCrossword: dc };
  }

  // Locked after a real solve or a give-up reveal — no further edits.
  if (sameDay.solved || sameDay.revealed) {
    return { ...state, dailyCrossword: dc };
  }

  if (payload.action === "reveal") {
    const next: DailyCrosswordState = {
      attempts: dc.attempts,
      completed: dc.completed,
      current: {
        date: payload.date,
        started: true,
        solved: false,
        revealed: true,
        cells: solutionCells(puzzle),
      },
    };
    return { ...state, dailyCrossword: next };
  }

  const cells = normalizeCells(
    puzzle,
    payload.action === "save"
      ? payload.cells
      : (payload.cells ?? sameDay.cells),
  );

  const solved = isGridSolved(puzzle, cells);
  const next: DailyCrosswordState = {
    attempts: dc.attempts,
    completed: solved ? dc.completed + 1 : dc.completed,
    current: {
      date: payload.date,
      started: true,
      solved,
      revealed: false,
      cells,
    },
  };
  return { ...state, dailyCrossword: next };
}

function normalizeCells(
  puzzle: MiniCrosswordPuzzle,
  cells: string[],
): string[] {
  const base = emptyCellsForPuzzle(puzzle);
  return base.map((b, i) => {
    if (b === "#") return "#";
    const raw = (cells[i] || "").toUpperCase().replace(/[^A-Z]/g, "");
    return raw.slice(0, 1);
  });
}

/** True when the clue contains the answer as a whole word (case-insensitive). */
export function clueLeaksAnswer(clue: string, answer: string): boolean {
  const a = answer.trim().toUpperCase();
  if (a.length < 2) return false;
  const re = new RegExp(`\\b${a.replace(/[^A-Z]/g, "")}\\b`, "i");
  return re.test(clue);
}

/** Validate pack integrity (tests). */
export function assertPuzzleValid(puzzle: MiniCrosswordPuzzle): void {
  const size = puzzleSize(puzzle);
  if (size < 5 || size > 9) {
    throw new Error(`${puzzle.id}: size ${size} out of range 5–9`);
  }
  for (const row of puzzle.rows) {
    if (row.length !== size) {
      throw new Error(`${puzzle.id}: row length ${row.length} ≠ ${size}`);
    }
  }
  const nums = startNumberMap(puzzle);
  for (const c of puzzle.across) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing across start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "across");
    if (a.length < 2) throw new Error(`${puzzle.id}: across ${c.num} short`);
    if (clueLeaksAnswer(c.clue, a)) {
      throw new Error(
        `${puzzle.id}: across ${c.num} clue leaks answer "${a}"`,
      );
    }
  }
  for (const c of puzzle.down) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing down start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "down");
    if (a.length < 2) throw new Error(`${puzzle.id}: down ${c.num} short`);
    if (clueLeaksAnswer(c.clue, a)) {
      throw new Error(`${puzzle.id}: down ${c.num} clue leaks answer "${a}"`);
    }
  }
  const clueTexts = [...puzzle.across, ...puzzle.down].map((c) =>
    c.clue.trim().toLowerCase(),
  );
  const seen = new Set<string>();
  for (const text of clueTexts) {
    if (seen.has(text)) {
      throw new Error(`${puzzle.id}: duplicate clue "${text}"`);
    }
    seen.add(text);
  }
}
