import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  MINI_CROSSWORDS,
  applyCrosswordAction,
  assertPuzzleValid,
  answerAt,
  bannerText,
  clearEntryCells,
  clueLeaksAnswer,
  correctWordCellIndexes,
  entryForCell,
  entryHasClearableLetters,
  entryHasLetters,
  isGridSolved,
  isWordCorrect,
  nextCellInDirection,
  puzzleForDate,
  solutionCells,
  todayFillPercent,
  emptyCellsForPuzzle,
  wordCellIndexes,
} from "./crossword";

describe("mini crossword pack", () => {
  it("validates every curated puzzle", () => {
    for (const p of MINI_CROSSWORDS) {
      expect(() => assertPuzzleValid(p)).not.toThrow();
      for (const c of p.across) {
        expect(answerAt(p, c.num, "across").length).toBeGreaterThanOrEqual(2);
      }
      for (const c of p.down) {
        expect(answerAt(p, c.num, "down").length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("includes mixed word lengths, not only 5-letter across", () => {
    const lengths = new Set<number>();
    for (const p of MINI_CROSSWORDS) {
      for (const c of p.across) {
        lengths.add(answerAt(p, c.num, "across").length);
      }
    }
    expect(lengths.has(5)).toBe(true);
    expect(lengths.has(4)).toBe(true);
  });

  it("serves a stable unique puzzle for a known date", () => {
    const p = puzzleForDate("2026-09-15");
    expect(p.rows.length).toBe(5);
    expect(() => assertPuzzleValid(p)).not.toThrow();
    const clues = [...p.across, ...p.down].map((c) => c.clue);
    expect(new Set(clues).size).toBe(clues.length);
    const answers = [
      ...p.across.map((c) => answerAt(p, c.num, "across")),
      ...p.down.map((c) => answerAt(p, c.num, "down")),
    ];
    expect(new Set(answers).size).toBe(answers.length);
  });

  it("keeps a long unique-answer rotation (no mid-cycle word repeats)", () => {
    expect(MINI_CROSSWORDS.length).toBeGreaterThanOrEqual(50);
    const seen = new Set<string>();
    let firstReuse: { day: number; word: string; id: string } | null = null;
    for (let i = 0; i < MINI_CROSSWORDS.length; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      const p = puzzleForDate(date);
      for (const dir of ["across", "down"] as const) {
        for (const c of p[dir]) {
          const a = answerAt(p, c.num, dir);
          if (seen.has(a) && !firstReuse) {
            firstReuse = { day: i, word: a, id: p.id };
          }
          seen.add(a);
        }
      }
    }
    expect(firstReuse).toBeNull();
  });

  it("never reuses the same answer word across the pack", () => {
    const seen = new Map<string, string>();
    for (const p of MINI_CROSSWORDS) {
      for (const dir of ["across", "down"] as const) {
        for (const c of p[dir]) {
          const a = answerAt(p, c.num, dir);
          const where = `${p.id}:${dir}:${c.num}`;
          expect(seen.has(a), `duplicate answer "${a}" at ${where} (also ${seen.get(a)})`).toBe(
            false,
          );
          seen.set(a, where);
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(MINI_CROSSWORDS.length * 5);
    for (const banned of ["OPERA", "ITEM", "ITEMS", "ALERT", "IDEAL"]) {
      expect(seen.has(banned), `retired answer ${banned} should stay out of pack`).toBe(false);
    }
  });

  it("rejects duplicate clue text", () => {
    const bad = {
      id: "dupe-clues",
      rows: ["AB#", "CDE", "#FG"],
      across: [
        { num: 1, clue: "Same text" },
        { num: 3, clue: "Other" },
      ],
      down: [
        { num: 1, clue: "Same text" },
        { num: 2, clue: "Else" },
      ],
    };
    // Use a valid 5×5 shape so size checks pass before clue uniqueness.
    const puzzle = {
      id: "dupe-clues",
      rows: ["FOLK#", "L#I#E", "OPERA", "W#G#S", "#NEST"],
      across: [
        { num: 1, clue: "Same text" },
        { num: 4, clue: "Other across" },
        { num: 5, clue: "Third across" },
      ],
      down: [
        { num: 1, clue: "Same text" },
        { num: 2, clue: "Other down" },
        { num: 3, clue: "Third down" },
      ],
    };
    expect(() => assertPuzzleValid(puzzle)).toThrow(/duplicate clue/);
    void bad;
  });

  it("never puts the answer word inside its clue", () => {
    for (const p of MINI_CROSSWORDS) {
      for (const c of p.across) {
        const a = answerAt(p, c.num, "across");
        expect(clueLeaksAnswer(c.clue, a)).toBe(false);
      }
      for (const c of p.down) {
        const a = answerAt(p, c.num, "down");
        expect(clueLeaksAnswer(c.clue, a)).toBe(false);
      }
    }
  });

  it("detects classic giveaway clues", () => {
    expect(clueLeaksAnswer("Southern belle, e.g.", "BELLE")).toBe(true);
    expect(clueLeaksAnswer("Spice from a sumac tree", "SUMAC")).toBe(true);
    expect(clueLeaksAnswer("Scarlett of Tara, for one", "BELLE")).toBe(false);
  });

  it("picks a stable puzzle for a date", () => {
    const a = puzzleForDate("2026-09-04");
    const b = puzzleForDate("2026-09-04");
    expect(a.id).toBe(b.id);
  });
});

describe("correct word feedback", () => {
  it("marks cells when a full across or down entry matches", () => {
    const puzzle = puzzleForDate("2026-09-06");
    const cells = emptyCellsForPuzzle(puzzle);
    const across = puzzle.across[0]!;
    const indexes = wordCellIndexes(puzzle, across.num, "across");
    const answer = answerAt(puzzle, across.num, "across");
    for (let i = 0; i < indexes.length; i++) {
      cells[indexes[i]!] = answer[i]!;
    }
    expect(isWordCorrect(puzzle, cells, across.num, "across")).toBe(true);
    const marked = correctWordCellIndexes(puzzle, cells);
    expect(marked.size).toBe(answer.length);
  });
});

describe("clear entry helpers", () => {
  it("clears letters for the active clue without touching others", () => {
    const puzzle = MINI_CROSSWORDS.find((p) => p.id === "ache-lemon")!;
    const cells = emptyCellsForPuzzle(puzzle);
    const across = puzzle.across[0]!;
    const indexes = wordCellIndexes(puzzle, across.num, "across");
    const answer = answerAt(puzzle, across.num, "across");
    for (let i = 0; i < indexes.length; i++) {
      cells[indexes[i]!] = answer[i] === "A" ? "X" : answer[i]!;
    }
    const other = wordCellIndexes(puzzle, puzzle.across[1]!.num, "across")[0]!;
    cells[other] = "Z";

    expect(entryHasLetters(cells, indexes)).toBe(true);
    const entry = entryForCell(puzzle, indexes[0]!, "across");
    expect(entry?.num).toBe(across.num);

    const cleared = clearEntryCells(puzzle, cells, indexes);
    for (const i of indexes) expect(cleared[i]).toBe("");
    expect(cleared[other]).toBe("Z");
  });

  it("keeps letters that already belong to a correct crossing word", () => {
    const puzzle = MINI_CROSSWORDS.find((p) => p.id === "ache-lemon")!;
    const cells = emptyCellsForPuzzle(puzzle);
    // Fill 1-Down correctly so those cells are locked as correct.
    const downIndexes = wordCellIndexes(puzzle, 1, "down");
    const downAnswer = answerAt(puzzle, 1, "down");
    for (let i = 0; i < downIndexes.length; i++) {
      cells[downIndexes[i]!] = downAnswer[i]!;
    }
    expect(isWordCorrect(puzzle, cells, 1, "down")).toBe(true);

    // Fill 1-Across with a wrong letter on a non-crossing cell.
    const acrossIndexes = wordCellIndexes(puzzle, 1, "across");
    for (const i of acrossIndexes) {
      if (!downIndexes.includes(i)) cells[i] = "X";
    }
    expect(isWordCorrect(puzzle, cells, 1, "across")).toBe(false);
    expect(entryHasClearableLetters(puzzle, cells, acrossIndexes)).toBe(true);

    const cleared = clearEntryCells(puzzle, cells, acrossIndexes);
    // Crossing letters from the correct down word stay.
    for (const i of downIndexes) {
      if (acrossIndexes.includes(i)) {
        expect(cleared[i]).toBe((cells[i] || "").toUpperCase());
      }
    }
    // Non-crossing wrong letters are wiped.
    for (const i of acrossIndexes) {
      if (!downIndexes.includes(i)) expect(cleared[i]).toBe("");
    }
  });

  it("moves along across/down, not flat grid order", () => {
    const puzzle = MINI_CROSSWORDS.find((p) => p.id === "ache-lemon")!;
    const start = wordCellIndexes(puzzle, 1, "down")[0]!;
    const nextDown = nextCellInDirection(puzzle, start, "down", 1);
    expect(nextDown).toBe(start + 5);
    const nextAcross = nextCellInDirection(puzzle, start, "across", 1);
    expect(nextAcross).toBe(start + 1);
  });
});

describe("applyCrosswordAction", () => {
  it("Start increments attempts once per day", () => {
    let state = emptyState();
    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    expect(state.dailyCrossword?.attempts).toBe(1);
    expect(state.dailyCrossword?.current?.started).toBe(true);

    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    expect(state.dailyCrossword?.attempts).toBe(1);
  });

  it("save persists cells and a full solve bumps completed", () => {
    let state = emptyState();
    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    const puzzle = puzzleForDate("2026-09-04");
    const cells = solutionCells(puzzle);

    expect(isGridSolved(puzzle, cells)).toBe(true);
    expect(todayFillPercent(puzzle, cells)).toBe(100);

    state = applyCrosswordAction(state, {
      action: "save",
      date: "2026-09-04",
      cells,
    });
    expect(state.dailyCrossword?.completed).toBe(1);
    expect(state.dailyCrossword?.current?.solved).toBe(true);
    expect(state.dailyCrossword?.current?.revealed).toBe(false);
    expect(
      bannerText(
        state.dailyCrossword!.completed,
        state.dailyCrossword!.attempts,
      ),
    ).toBe("1/1 · 100%");
  });

  it("banner % is lifetime success rate, not today fill", () => {
    expect(bannerText(2, 3)).toBe("2/3 · 67%");
    expect(bannerText(0, 0)).toBe("0/0 · —");
    expect(bannerText(0, 2)).toBe("0/2 · 0%");
    expect(bannerText(8, 15)).toBe("8/15 · 53%");
  });

  it("reveal fills answers, locks the day, and does not count as a win", () => {
    let state = emptyState();
    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    const puzzle = puzzleForDate("2026-09-04");

    state = applyCrosswordAction(state, { action: "reveal", date: "2026-09-04" });
    expect(state.dailyCrossword?.completed).toBe(0);
    expect(state.dailyCrossword?.attempts).toBe(1);
    expect(state.dailyCrossword?.current?.revealed).toBe(true);
    expect(state.dailyCrossword?.current?.solved).toBe(false);
    expect(state.dailyCrossword?.current?.cells).toEqual(solutionCells(puzzle));

    // Locked — further saves cannot bump completed
    state = applyCrosswordAction(state, {
      action: "save",
      date: "2026-09-04",
      cells: solutionCells(puzzle),
    });
    expect(state.dailyCrossword?.completed).toBe(0);
    expect(state.dailyCrossword?.current?.revealed).toBe(true);
  });
});
