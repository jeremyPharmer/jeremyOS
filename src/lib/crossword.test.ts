import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  MINI_CROSSWORDS,
  applyCrosswordAction,
  assertPuzzleValid,
  answerAt,
  bannerText,
  correctWordCellIndexes,
  isGridSolved,
  isWordCorrect,
  puzzleForDate,
  solutionCells,
  todayFillPercent,
  emptyCellsForPuzzle,
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
    const answer = answerAt(puzzle, across.num, "across");
    // Fill only the first across word
    let col = 0;
    const startRow = 0;
    for (let i = 0; i < answer.length; i++) {
      while (puzzle.rows[startRow]![col] === "#") col += 1;
      cells[startRow * 5 + col] = answer[i]!;
      col += 1;
    }
    // For this pack, across 1 is always row 0
    expect(isWordCorrect(puzzle, cells, across.num, "across")).toBe(true);
    const marked = correctWordCellIndexes(puzzle, cells);
    expect(marked.size).toBe(answer.length);
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
