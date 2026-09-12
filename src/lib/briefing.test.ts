import { describe, expect, it } from "vitest";
import {
  historyExcerpt,
  sevenDayTrendInsight,
  thisDayInHistory,
  thisDayInHistoryTitle,
  workoutGapInsight,
} from "./briefing";
import type { JournalEntry, RebuildState, WorkoutLog } from "./types";

function journal(
  date: string,
  type: "one_line" | "journal",
  text: string,
): JournalEntry {
  return {
    id: `${date}-${type}`,
    date,
    type,
    text,
    createdAt: `${date}T12:00:00.000Z`,
  };
}

describe("thisDayInHistory", () => {
  it("returns all past years for the month-day, newest first, excluding today", () => {
    const journals = [
      journal("2026-09-12", "one_line", "Today should be skipped"),
      journal("2025-09-12", "one_line", "Last year"),
      journal("2025-09-12", "journal", "A longer note from 2025."),
      journal("2023-09-12", "one_line", "Three years back"),
      journal("2024-09-11", "one_line", "Wrong day"),
      journal("2022-09-12", "journal", "Only summary counts"),
    ];
    const entries = thisDayInHistory(journals, "2026-09-12");
    expect(entries.map((e) => e.year)).toEqual([2025, 2023, 2022]);
    expect(entries[0]?.headline).toBe("Last year");
    expect(entries[0]?.summary).toBe("A longer note from 2025.");
    expect(thisDayInHistoryTitle("2026-09-12")).toMatch(/September 12/);
  });

  it("skips empty journal days", () => {
    const journals = [
      journal("2024-03-01", "one_line", "   "),
      journal("2023-03-01", "one_line", "Real entry"),
    ];
    expect(thisDayInHistory(journals, "2025-03-01")).toHaveLength(1);
  });
});

describe("historyExcerpt", () => {
  it("prefers summary and truncates long text", () => {
    const long = "x".repeat(200);
    expect(historyExcerpt({ headline: "H", summary: "Short note" })).toBe(
      "Short note",
    );
    expect(historyExcerpt({ headline: "Only headline" })).toBe("Only headline");
    const clipped = historyExcerpt({ summary: long });
    expect(clipped.length).toBeLessThanOrEqual(180);
    expect(clipped.endsWith("…")).toBe(true);
  });
});

describe("workoutGapInsight", () => {
  it("reports days since any workout and longest type gap", () => {
    const workouts: WorkoutLog[] = [
      {
        id: "1",
        date: "2026-09-10",
        type: "run",
        label: "Easy run",
        createdAt: "2026-09-10T12:00:00.000Z",
      },
      {
        id: "2",
        date: "2026-09-01",
        type: "lift",
        label: "Upper",
        createdAt: "2026-09-01T12:00:00.000Z",
      },
      {
        id: "3",
        date: "2026-08-20",
        type: "hiit",
        label: "Circuit",
        createdAt: "2026-08-20T12:00:00.000Z",
      },
    ];
    const insight = workoutGapInsight(workouts, "2026-09-12");
    expect(insight.daysSinceAny).toBe(2);
    expect(insight.anyLabel).toMatch(/2 days since any workout/);
    expect(insight.longestType).toBe("stretch");
    expect(insight.typeLabel).toMatch(/stretch/i);
  });

  it("handles empty workout log", () => {
    const insight = workoutGapInsight([], "2026-09-12");
    expect(insight.daysSinceAny).toBeNull();
    expect(insight.anyLabel).toMatch(/No workouts/);
  });
});

describe("sevenDayTrendInsight", () => {
  it("averages mood and sleep across the last 7 days", () => {
    const state = {
      mornings: [
        {
          date: "2026-09-06",
          sleepHours: 6,
          sleepQuality: 5,
          mood: 4,
          energy: 5,
          stress: 5,
          intention: "a",
          completedAt: "2026-09-06T08:00:00.000Z",
        },
        {
          date: "2026-09-10",
          sleepHours: 8,
          sleepQuality: 8,
          mood: 8,
          energy: 7,
          stress: 3,
          intention: "b",
          completedAt: "2026-09-10T08:00:00.000Z",
        },
        {
          date: "2026-09-12",
          sleepHours: 7,
          sleepQuality: 7,
          mood: 7,
          energy: 7,
          stress: 4,
          intention: "c",
          completedAt: "2026-09-12T08:00:00.000Z",
        },
      ],
      evenings: [],
      journals: [],
      profile: undefined,
    } as unknown as RebuildState;

    const insight = sevenDayTrendInsight(state, "2026-09-12");
    expect(insight.moodSeries).toHaveLength(7);
    expect(insight.moodAvg).not.toBeNull();
    expect(insight.lines.some((l) => /Mood averaging/.test(l))).toBe(true);
    expect(insight.lines.some((l) => /Sleep/.test(l))).toBe(true);
  });
});
