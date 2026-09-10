import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  cravingHeadwindHours,
  cravingPlaybook,
  cravingPointsLastYear,
  filledTrendPointsInRange,
  lastFourWeeks,
  PLAYBOOK_MIN_N,
  resolveConditionRange,
  roundSleepHours,
  supportRhythmLastFourWeeks,
  trendPointsInRange,
  trendPointsLastYear,
} from "./trends";
import { DEFAULT_SUPPORTS } from "./types";
import type { CravingEvent, SupportCompletion } from "./types";

function baseState() {
  const state = emptyState();
  state.profile = {
    id: "u",
    createdAt: "",
    onboarded: true,
    displayName: "J",
    historicalDailySpend: 10,
    startDate: "2026-08-10",
    currentRunId: "run_1",
    currentRunStartedOn: "2026-08-10",
    supports: DEFAULT_SUPPORTS,
    timezone: "America/New_York",
  };
  return state;
}

function craving(
  partial: Partial<CravingEvent> &
    Pick<CravingEvent, "id" | "at" | "intensityBefore">,
): CravingEvent {
  return {
    situation: "x",
    intervention: "delay",
    ...partial,
  };
}

describe("trendPointsInRange", () => {
  it("builds points from mornings within the window without craving", () => {
    const state = baseState();
    state.mornings = [
      {
        date: "2026-08-10",
        sleepHours: 7.5,
        sleepQuality: 6,
        mood: 5,
        energy: 4,
        stress: 7,
        craving: 3,
        intention: "x",
        completedAt: "",
      },
      {
        date: "2026-08-12",
        sleepHours: 8,
        sleepQuality: 8,
        mood: 8,
        energy: 8,
        stress: 2,
        craving: 1,
        intention: "mid",
        completedAt: "",
      },
      {
        date: "2025-01-01",
        sleepHours: 8,
        sleepQuality: 8,
        mood: 8,
        energy: 8,
        stress: 2,
        craving: 1,
        intention: "old",
        completedAt: "",
      },
    ];
    const points = trendPointsInRange(state, "2026-08-10", "2026-08-11");
    expect(points).toHaveLength(1);
    expect(points[0].date).toBe("2026-08-10");
    expect(points[0].sleepQuality).toBe(6);
    expect(points[0]).not.toHaveProperty("craving");
  });
});

describe("filledTrendPointsInRange", () => {
  it("returns one slot per calendar day in the selected window", () => {
    const state = baseState();
    state.mornings = [
      {
        date: "2026-08-10",
        sleepHours: 7.5,
        sleepQuality: 6,
        mood: 5,
        energy: 4,
        stress: 7,
        craving: 3,
        intention: "x",
        completedAt: "",
      },
      {
        date: "2026-08-12",
        sleepHours: 8,
        sleepQuality: 8,
        mood: 8,
        energy: 8,
        stress: 2,
        craving: 1,
        intention: "mid",
        completedAt: "",
      },
    ];
    const points = filledTrendPointsInRange(state, "2026-08-10", "2026-08-12");
    expect(points).toHaveLength(3);
    expect(points.map((p) => p.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
    expect(points[0].sleepQuality).toBe(6);
    expect(points[0].sleepHours).toBe(7.5);
    expect(points[1].sleepQuality).toBeUndefined();
    expect(points[1].sleepHours).toBeUndefined();
    expect(points[2].sleepQuality).toBe(8);
    expect(points[2].sleepHours).toBe(8);
  });
});

describe("resolveConditionRange", () => {
  it("clamps rolling windows to journey start", () => {
    expect(resolveConditionRange("7", "2026-08-15", "2026-08-20")).toEqual({
      start: "2026-08-15",
      end: "2026-08-20",
    });
    expect(resolveConditionRange("7", "2026-01-01", "2026-08-20")).toEqual({
      start: "2026-08-14",
      end: "2026-08-20",
    });
    expect(resolveConditionRange("30", "2026-08-15", "2026-08-20")).toEqual({
      start: "2026-08-15",
      end: "2026-08-20",
    });
    expect(resolveConditionRange("90", "2026-01-01", "2026-08-20")).toEqual({
      start: "2026-05-23",
      end: "2026-08-20",
    });
    expect(resolveConditionRange("30", "2026-07-01", "2026-08-20")).toEqual({
      start: "2026-07-22",
      end: "2026-08-20",
    });
  });

  it("clamps custom dates to journey bounds", () => {
    expect(
      resolveConditionRange("custom", "2026-08-10", "2026-08-20", {
        start: "2026-08-01",
        end: "2026-08-25",
      }),
    ).toEqual({
      start: "2026-08-10",
      end: "2026-08-20",
    });
  });
});

describe("trendPointsLastYear", () => {
  it("builds points from mornings within the window without craving", () => {
    const state = baseState();
    state.mornings = [
      {
        date: "2026-08-10",
        sleepHours: 7.5,
        sleepQuality: 6,
        mood: 5,
        energy: 4,
        stress: 7,
        craving: 3,
        intention: "x",
        completedAt: "",
      },
      {
        date: "2025-01-01",
        sleepHours: 8,
        sleepQuality: 8,
        mood: 8,
        energy: 8,
        stress: 2,
        craving: 1,
        intention: "old",
        completedAt: "",
      },
    ];
    const points = trendPointsLastYear(state, "2026-08-11");
    expect(points).toHaveLength(1);
    expect(points[0].date).toBe("2026-08-10");
    expect(points[0].sleepQuality).toBe(6);
    expect(points[0]).not.toHaveProperty("craving");
  });
});

describe("cravingPointsLastYear", () => {
  it("sums before, remaining, and drop; incomplete events do not fake a drop", () => {
    const state = baseState();
    state.cravings = [
      craving({
        id: "c1",
        at: "2026-08-10T14:00:00.000Z",
        intensityBefore: 5,
        intensityAfter: 2,
        outcome: "Walk",
      }),
      craving({
        id: "c2",
        at: "2026-08-10T20:00:00.000Z",
        intensityBefore: 7,
        intensityAfter: 1,
        outcome: "Contact someone",
      }),
      craving({
        id: "c3",
        at: "2026-08-11T12:00:00.000Z",
        intensityBefore: 3,
      }),
    ];
    const points = cravingPointsLastYear(state, "2026-08-11");
    expect(points).toEqual([
      { date: "2026-08-10", points: 12, remaining: 3, dropped: 9 },
      { date: "2026-08-11", points: 3, remaining: 3, dropped: 0 },
    ]);
  });
});

describe("cravingPlaybook", () => {
  it("is empty until enough completed events", () => {
    const state = baseState();
    state.cravings = [
      craving({
        id: "c1",
        at: "2026-08-10T14:00:00.000Z",
        intensityBefore: 8,
        intensityAfter: 2,
        outcome: "Walk",
      }),
      craving({
        id: "c2",
        at: "2026-08-11T14:00:00.000Z",
        intensityBefore: 6,
        intensityAfter: 3,
        outcome: "Walk",
      }),
    ];
    expect(PLAYBOOK_MIN_N).toBe(3);
    expect(cravingPlaybook(state, "2026-08-11")).toEqual([]);
  });

  it("ranks outcomes by average drop and ignores before-only events", () => {
    const state = baseState();
    state.cravings = [
      craving({
        id: "c1",
        at: "2026-08-10T14:00:00.000Z",
        intensityBefore: 8,
        intensityAfter: 2,
        outcome: "Walk",
      }),
      craving({
        id: "c2",
        at: "2026-08-10T18:00:00.000Z",
        intensityBefore: 6,
        intensityAfter: 4,
        outcome: "Walk",
      }),
      craving({
        id: "c3",
        at: "2026-08-11T14:00:00.000Z",
        intensityBefore: 9,
        intensityAfter: 1,
        outcome: "Breathing",
      }),
      craving({
        id: "c4",
        at: "2026-08-11T20:00:00.000Z",
        intensityBefore: 5,
      }),
      craving({
        id: "c5",
        at: "2026-08-12T14:00:00.000Z",
        intensityBefore: 4,
        intensityAfter: 3,
        intervention: "delay",
      }),
    ];
    const rows = cravingPlaybook(state, "2026-08-12");
    expect(rows).toEqual([
      { outcome: "Breathing", n: 1, avgDrop: 8 },
      { outcome: "Walk", n: 2, avgDrop: 4 },
    ]);
  });
});

describe("cravingHeadwindHours", () => {
  it("buckets by local daypart and weekday", () => {
    const state = baseState();
    // NY in August is EDT (UTC-4).
    // 14:00Z → 10:00 morning Mon; 21:00Z → 17:00 evening Mon;
    // 02:00Z next day → 22:00 night Mon.
    state.cravings = [
      craving({
        id: "c1",
        at: "2026-08-10T14:00:00.000Z",
        intensityBefore: 5,
      }),
      craving({
        id: "c2",
        at: "2026-08-10T21:00:00.000Z",
        intensityBefore: 8,
      }),
      craving({
        id: "c3",
        at: "2026-08-11T02:00:00.000Z",
        intensityBefore: 6,
      }),
    ];
    const hours = cravingHeadwindHours(state, "2026-08-11");
    expect(hours.total).toBe(3);
    const morning = hours.byDaypart.find((p) => p.key === "morning");
    const evening = hours.byDaypart.find((p) => p.key === "evening");
    const night = hours.byDaypart.find((p) => p.key === "night");
    expect(morning?.count).toBe(1);
    expect(evening?.count).toBe(1);
    expect(night?.count).toBe(1);
    expect(hours.peak).toBeUndefined();
    const monday = hours.byWeekday.find((d) => d.label === "Mon");
    expect(monday?.count).toBe(3);
  });

  it("names a peak when one daypart leads", () => {
    const state = baseState();
    state.cravings = [
      craving({
        id: "c1",
        at: "2026-08-10T22:00:00.000Z",
        intensityBefore: 7,
      }),
      craving({
        id: "c2",
        at: "2026-08-11T22:30:00.000Z",
        intensityBefore: 6,
      }),
      craving({
        id: "c3",
        at: "2026-08-11T14:00:00.000Z",
        intensityBefore: 4,
      }),
    ];
    const hours = cravingHeadwindHours(state, "2026-08-11");
    expect(hours.peak?.key).toBe("evening");
    expect(hours.peak?.hoursLabel).toBe("5pm–9pm");
  });
});

describe("supportRhythmLastFourWeeks", () => {
  it("counts completions vs target across four Sunday weeks", () => {
    const state = baseState();
    // 2026-08-18 is a Tuesday; current week Sun 16–Sat 22.
    state.supports = [
      {
        date: "2026-08-17",
        supportType: "gym",
        completed: true,
        completedAt: "",
      },
      {
        date: "2026-08-18",
        supportType: "gym",
        completed: true,
        completedAt: "",
      },
      {
        date: "2026-08-10",
        supportType: "gym",
        completed: true,
        completedAt: "",
      },
    ] as SupportCompletion[];
    const weeks = lastFourWeeks("2026-08-18");
    expect(weeks).toHaveLength(4);
    expect(weeks[3].isCurrent).toBe(true);
    expect(weeks[3].start).toBe("2026-08-16");
    const gym = supportRhythmLastFourWeeks(state, "2026-08-18").find(
      (s) => s.type === "gym",
    );
    expect(gym?.target).toBe(4);
    expect(gym?.weeks[3].done).toBe(2);
    const prev = gym?.weeks.find((w) => w.start === "2026-08-09");
    expect(prev?.done).toBe(1);
  });

  it("adds gym vs rest contrast only with enough active days on both sides", () => {
    const state = baseState();
    state.mornings = [];
    for (let i = 0; i < 8; i++) {
      const date = `2026-08-${String(10 + i).padStart(2, "0")}`;
      state.mornings.push({
        date,
        sleepHours: 7,
        sleepQuality: 6,
        mood: 5,
        energy: 5,
        stress: 5,
        intention: "x",
        completedAt: "",
      });
    }
    state.supports = [10, 12, 14].map((d) => ({
      date: `2026-08-${d}`,
      supportType: "gym" as const,
      completed: true,
      completedAt: "",
    }));
    state.cravings = [
      craving({
        id: "g1",
        at: "2026-08-10T20:00:00.000Z",
        intensityBefore: 2,
      }),
      craving({
        id: "r1",
        at: "2026-08-11T20:00:00.000Z",
        intensityBefore: 8,
      }),
      craving({
        id: "r2",
        at: "2026-08-13T20:00:00.000Z",
        intensityBefore: 6,
      }),
    ];
    const gym = supportRhythmLastFourWeeks(state, "2026-08-17").find(
      (s) => s.type === "gym",
    );
    expect(gym?.contrast?.withSupport.days).toBe(3);
    expect(gym?.contrast?.withoutSupport.days).toBe(5);
    expect(gym?.contrast?.withSupport.avgPoints).toBeCloseTo(2 / 3);
    expect(gym?.contrast?.withoutSupport.avgPoints).toBeCloseTo(14 / 5);
  });
});

describe("roundSleepHours", () => {
  it("rounds to half-hour increments", () => {
    expect(roundSleepHours(7)).toBe(7);
    expect(roundSleepHours(7.2)).toBe(7);
    expect(roundSleepHours(7.3)).toBe(7.5);
    expect(roundSleepHours(7.75)).toBe(8);
  });
});
