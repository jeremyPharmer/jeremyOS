import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  MINI_CROSSWORDS,
  applyCrosswordAction,
  assertPuzzleValid,
  answerAt,
  bannerText,
  isGridSolved,
  puzzleForDate,
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

describe("applyCrosswordAction", () => {
  it("Start increments attempts once per day", () => {
    let state = emptyState();
    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    expect(state.dailyCrossword?.attempts).toBe(1);
    expect(state.dailyCrossword?.current?.started).toBe(true);

    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    expect(state.dailyCrossword?.attempts).toBe(1);
  });

  it("save persists cells and complete bumps completed", () => {
    let state = emptyState();
    state = applyCrosswordAction(state, { action: "start", date: "2026-09-04" });
    const puzzle = puzzleForDate("2026-09-04");
    const cells = emptyCellsForPuzzle(puzzle).map((c, i) => {
      if (c === "#") return "#";
      const row = Math.floor(i / 5);
      const col = i % 5;
      return puzzle.rows[row]![col]!;
    });

    expect(isGridSolved(puzzle, cells)).toBe(true);
    expect(todayFillPercent(puzzle, cells)).toBe(100);

    state = applyCrosswordAction(state, {
      action: "save",
      date: "2026-09-04",
      cells,
    });
    expect(state.dailyCrossword?.completed).toBe(1);
    expect(state.dailyCrossword?.current?.solved).toBe(true);
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
});
