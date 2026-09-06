import type { RebuildState } from "./types";

export const CROSSWORD_SIZE = 5;

/** One curated 5×5 mini — `#` = black cell. */
export type MiniCrosswordPuzzle = {
  id: string;
  /** Five strings of length 5; letters = solution, `#` = block */
  rows: [string, string, string, string, string];
  across: { num: number; clue: string }[];
  down: { num: number; clue: string }[];
};

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
  /** Length 25; `""` empty, letter, or `"#"` for black */
  cells: string[];
};

export type DailyCrosswordState = {
  attempts: number;
  completed: number;
  current?: CrosswordDayProgress;
};

/**
 * Hand-authored pack — denser interlocking pattern:
 *   XXXXX
 *   X#X#X
 *   XXXXX
 *   X#X#X
 *   XXXXX
 * Across 1/4/5 (rows 0,2,4); down 1/2/3 (cols 0,2,4). Rotate by day-of-year.
 */
export const MINI_CROSSWORDS: MiniCrosswordPuzzle[] = [
  {
    id: "vivid-spoil",
    rows: ["VIVID", "I#I#E", "SPOIL", "I#L#T", "TIARA"],
    across: [
      { num: 1, clue: "Technicolor, as a dream" },
      { num: 4, clue: "Ruin by overindulgence" },
      { num: 5, clue: "Diadem for a pageant" },
    ],
    down: [
      { num: 1, clue: "Drop by, briefly" },
      { num: 2, clue: "Violin’s deeper cousin" },
      { num: 3, clue: "River mouth landform" },
    ],
  },
  {
    id: "spree-manor",
    rows: ["SPREE", "U#I#G", "MANOR", "A#S#E", "CLEAT"],
    across: [
      { num: 1, clue: "Bender with a credit card" },
      { num: 4, clue: "Downton-style digs" },
      { num: 5, clue: "Deck-shoe gripper" },
    ],
    down: [
      { num: 1, clue: "Spice from a sumac tree" },
      { num: 2, clue: "Lather, ___, repeat" },
      { num: 3, clue: "Heron of marsh fame" },
    ],
  },
  {
    id: "spunk-ardor",
    rows: ["SPUNK", "T#N#A", "ARDOR", "S#U#M", "HYENA"],
    across: [
      { num: 1, clue: "Moxie, informally" },
      { num: 4, clue: "Heat of passion" },
      { num: 5, clue: "Laughing scavenger" },
    ],
    down: [
      { num: 1, clue: "Emergency cash cache" },
      { num: 2, clue: "Excessive, as pressure" },
      { num: 3, clue: "What goes around…" },
    ],
  },
  {
    id: "boost-logic",
    rows: ["BOOST", "E#U#A", "LOGIC", "L#H#K", "ENTRY"],
    across: [
      { num: 1, clue: "Give a leg up" },
      { num: 4, clue: "Spock’s strong suit" },
      { num: 5, clue: "Doorway or ledger line" },
    ],
    down: [
      { num: 1, clue: "Southern belle, e.g." },
      { num: 2, clue: "Should, biblically" },
      { num: 3, clue: "Gaudy or sticky, slangily" },
    ],
  },
  {
    id: "weigh-polar",
    rows: ["WEIGH", "I#S#U", "POLAR", "E#E#R", "DITTY"],
    across: [
      { num: 1, clue: "Consider carefully" },
      { num: 4, clue: "Of opposite extremes" },
      { num: 5, clue: "Little song" },
    ],
    down: [
      { num: 1, clue: "Erased, as a slate" },
      { num: 2, clue: "Key in a chain, maybe" },
      { num: 3, clue: "Move with haste" },
    ],
  },
  {
    id: "video-whips",
    rows: ["VIDEO", "O#R#A", "WHIPS", "E#F#I", "LOTUS"],
    across: [
      { num: 1, clue: "TikTok unit, once" },
      { num: 4, clue: "Beats handily" },
      { num: 5, clue: "Padma’s namesake bloom" },
    ],
    down: [
      { num: 1, clue: "A, E, I, O, or U" },
      { num: 2, clue: "Snowbank mover" },
      { num: 3, clue: "Mirage haven" },
    ],
  },
  {
    id: "order-slimy",
    rows: ["ORDER", "N#R#H", "SLIMY", "E#F#M", "TITLE"],
    across: [
      { num: 1, clue: "Court command" },
      { num: 4, clue: "Eel-like" },
      { num: 5, clue: "Champ’s belt, say" },
    ],
    down: [
      { num: 1, clue: "Beginning, as of winter" },
      { num: 2, clue: "Continental shift" },
      { num: 3, clue: "Sounds-alike pairing" },
    ],
  },
  {
    id: "yacht-hoard",
    rows: ["YACHT", "A#H#O", "HOARD", "O#R#A", "ODDLY"],
    across: [
      { num: 1, clue: "Monaco dock resident" },
      { num: 4, clue: "Dragon’s currency" },
      { num: 5, clue: "In a queer way" },
    ],
    down: [
      { num: 1, clue: "Search engine, once a whoop" },
      { num: 2, clue: "Swiss bunches of green" },
      { num: 3, clue: "Calendar’s lead story" },
    ],
  },
  {
    id: "clasp-phone",
    rows: ["CLASP", "A#L#I", "PHONE", "E#O#C", "RIFLE"],
    across: [
      { num: 1, clue: "Brooch’s better half" },
      { num: 4, clue: "Dial or FaceTime" },
      { num: 5, clue: "Search thoroughly" },
    ],
    down: [
      { num: 1, clue: "Prank or frolic" },
      { num: 2, clue: "Coolly distant" },
      { num: 3, clue: "Share of the pie" },
    ],
  },
  {
    id: "three-inlet",
    rows: ["THREE", "R#U#N", "INLET", "A#E#R", "DERBY"],
    across: [
      { num: 1, clue: "Crowd’s a ___" },
      { num: 4, clue: "Bay’s little sibling" },
      { num: 5, clue: "Churchill Downs event" },
    ],
    down: [
      { num: 1, clue: "Chord of three tones" },
      { num: 2, clue: "Yardstick wielder" },
      { num: 3, clue: "Admission or debut" },
    ],
  },
  {
    id: "visor-scoff",
    rows: ["VISOR", "I#P#I", "SCOFF", "O#O#L", "RANGE"],
    across: [
      { num: 1, clue: "Sun-blocking brim" },
      { num: 4, clue: "Jeer at" },
      { num: 5, clue: "Stove’s domain" },
    ],
    down: [
      { num: 1, clue: "Helmet flap, again" },
      { num: 2, clue: "Utensil drawer staple" },
      { num: 3, clue: "Gun or file through" },
    ],
  },
  {
    id: "synth-vegan",
    rows: ["SYNTH", "E#I#O", "VEGAN", "E#H#O", "ROTOR"],
    across: [
      { num: 1, clue: "Moog’s domain, briefly" },
      { num: 4, clue: "No-dairy diner" },
      { num: 5, clue: "Chopper blade hub" },
    ],
    down: [
      { num: 1, clue: "Cut off, as ties" },
      { num: 2, clue: "Owl’s working hours" },
      { num: 3, clue: "Medal-worthy esteem" },
    ],
  },
  {
    id: "synth-bison",
    rows: ["SYNTH", "O#A#O", "BISON", "E#A#O", "RULER"],
    across: [
      { num: 1, clue: "Keyboard cousin of a piano" },
      { num: 4, clue: "Yellowstone heavyweight" },
      { num: 5, clue: "Desk edge straightener" },
    ],
    down: [
      { num: 1, clue: "Straight-faced" },
      { num: 2, clue: "Twangy, as a voice" },
      { num: 3, clue: "What a toast confers" },
    ],
  },
  {
    id: "abyss-ulcer",
    rows: ["ABYSS", "Z#A#U", "ULCER", "R#H#L", "ENTRY"],
    across: [
      { num: 1, clue: "Bottomless gulf" },
      { num: 4, clue: "Stomach’s unwelcome guest" },
      { num: 5, clue: "Password’s counterpart" },
    ],
    down: [
      { num: 1, clue: "Sky-blue, poetically" },
      { num: 2, clue: "Monaco’s marina darling" },
      { num: 3, clue: "Ill-tempered" },
    ],
  },
];

function dayOfYear(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  const now = Date.UTC(y, m - 1, d);
  return Math.floor((now - start) / 86_400_000);
}

export function puzzleForDate(date: string): MiniCrosswordPuzzle {
  const pack = MINI_CROSSWORDS;
  const idx = ((dayOfYear(date) % pack.length) + pack.length) % pack.length;
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
  const map = new Map<number, number>();
  let next = 1;
  for (let r = 0; r < CROSSWORD_SIZE; r++) {
    for (let c = 0; c < CROSSWORD_SIZE; c++) {
      if (puzzle.rows[r]![c] === "#") continue;
      const isAcross =
        (c === 0 || puzzle.rows[r]![c - 1] === "#") &&
        c + 1 < CROSSWORD_SIZE &&
        puzzle.rows[r]![c + 1] !== "#";
      const isDown =
        (r === 0 || puzzle.rows[r - 1]![c] === "#") &&
        r + 1 < CROSSWORD_SIZE &&
        puzzle.rows[r + 1]![c] !== "#";
      if (!isAcross && !isDown) continue;
      map.set(r * CROSSWORD_SIZE + c, next);
      next += 1;
    }
  }
  return map;
}

export function buildGrid(puzzle: MiniCrosswordPuzzle): CrosswordCell[] {
  const starts = startNumberMap(puzzle);
  const cells: CrosswordCell[] = [];
  for (let row = 0; row < CROSSWORD_SIZE; row++) {
    for (let col = 0; col < CROSSWORD_SIZE; col++) {
      const index = row * CROSSWORD_SIZE + col;
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
  const start = clueStartIndex(puzzle, num);
  if (start == null) return "";
  const row = Math.floor(start / CROSSWORD_SIZE);
  const col = start % CROSSWORD_SIZE;
  let out = "";
  if (dir === "across") {
    for (let c = col; c < CROSSWORD_SIZE; c++) {
      const ch = puzzle.rows[row]![c]!;
      if (ch === "#") break;
      out += ch;
    }
  } else {
    for (let r = row; r < CROSSWORD_SIZE; r++) {
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
  if (cells.length !== CROSSWORD_SIZE * CROSSWORD_SIZE) return false;
  for (let i = 0; i < cells.length; i++) {
    const row = Math.floor(i / CROSSWORD_SIZE);
    const col = i % CROSSWORD_SIZE;
    const sol = puzzle.rows[row]![col]!;
    if (sol === "#") continue;
    if ((cells[i] || "").toUpperCase() !== sol.toUpperCase()) return false;
  }
  return true;
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
  todayPct: number,
  started: boolean,
): string {
  const frac = `${completed}/${attempts}`;
  if (!started) return `${frac} · —`;
  return `${frac} · ${todayPct}%`;
}

export type CrosswordAction =
  | { action: "start"; date: string }
  | { action: "save"; date: string; cells: string[] }
  | { action: "complete"; date: string; cells?: string[] };

export function applyCrosswordAction(
  state: RebuildState,
  payload: CrosswordAction,
): RebuildState {
  const puzzle = puzzleForDate(payload.date);
  const dc = normalizeDailyCrossword(state.dailyCrossword);
  const sameDay = dc.current?.date === payload.date ? dc.current : undefined;

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
        cells: emptyCellsForPuzzle(puzzle),
      },
    };
    return { ...state, dailyCrossword: next };
  }

  if (!sameDay?.started) {
    return { ...state, dailyCrossword: dc };
  }

  const cells = normalizeCells(
    puzzle,
    payload.action === "save"
      ? payload.cells
      : (payload.cells ?? sameDay.cells),
  );

  const solved = isGridSolved(puzzle, cells);
  const wasSolved = sameDay.solved;
  const next: DailyCrosswordState = {
    attempts: dc.attempts,
    completed: !wasSolved && solved ? dc.completed + 1 : dc.completed,
    current: {
      date: payload.date,
      started: true,
      solved: wasSolved || solved,
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

/** Validate pack integrity (tests). */
export function assertPuzzleValid(puzzle: MiniCrosswordPuzzle): void {
  if (puzzle.rows.length !== CROSSWORD_SIZE) {
    throw new Error(`${puzzle.id}: need 5 rows`);
  }
  for (const row of puzzle.rows) {
    if (row.length !== CROSSWORD_SIZE) {
      throw new Error(`${puzzle.id}: row length ${row}`);
    }
  }
  const nums = startNumberMap(puzzle);
  for (const c of puzzle.across) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing across start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "across");
    if (a.length < 2) throw new Error(`${puzzle.id}: across ${c.num} short`);
  }
  for (const c of puzzle.down) {
    if (![...nums.values()].includes(c.num)) {
      throw new Error(`${puzzle.id}: missing down start ${c.num}`);
    }
    const a = answerAt(puzzle, c.num, "down");
    if (a.length < 2) throw new Error(`${puzzle.id}: down ${c.num} short`);
  }
}
