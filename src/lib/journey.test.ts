import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  cleanDaysThisRun,
  formatSinceDate,
  isValidEveningDate,
  lastActiveDay,
  missingEveningDates,
  nextIncentive,
  nextMilestones,
  projectedReclaimAt,
  suggestedRewardPool,
  waitingReclaimTotal,
  weekBounds,
  weekFullyComplete,
  weeklySupportProgress,
} from "./journey";
import { applyEveningSideEffects, confirmTransfer, ensureElapsedReclaimDays, ensureMilestonesReached, resetCurrentRun } from "./mutations";
import { DEFAULT_SUPPORTS, type RebuildState } from "./types";
import { emptyState } from "./journey";

function baseState(): RebuildState {
  const state = emptyState();
  state.profile = {
    id: "user_1",
    createdAt: new Date().toISOString(),
    onboarded: true,
    displayName: "Founder",
    historicalDailySpend: 40,
    startDate: "2026-08-01",
    currentRunId: "run_1",
    currentRunStartedOn: "2026-08-01",
    supports: DEFAULT_SUPPORTS,
    timezone: "America/Los_Angeles",
  };
  return state;
}

describe("lastActiveDay", () => {
  it("returns null with no mornings or evenings", () => {
    expect(lastActiveDay(baseState())).toBeNull();
  });

  it("uses the later of morning vs evening completedAt", () => {
    const state = baseState();
    state.mornings = [
      {
        date: "2026-08-14",
        sleepHours: 7,
        sleepQuality: 7,
        mood: 7,
        energy: 7,
        stress: 3,
        intention: "focus",
        completedAt: "2026-08-14T14:00:00.000Z",
      },
    ];
    state.evenings = [
      {
        date: "2026-08-15",
        mood: 7,
        alignment: "aligned",
        oneLine: "ok",
        completedAt: "2026-08-16T02:00:00.000Z",
      },
    ];
    expect(lastActiveDay(state)).toBe("2026-08-15");
  });

  it("prefers a later morning over an earlier evening", () => {
    const state = baseState();
    state.mornings = [
      {
        date: "2026-08-16",
        sleepHours: 7,
        sleepQuality: 7,
        mood: 7,
        energy: 7,
        stress: 3,
        intention: "focus",
        completedAt: "2026-08-16T15:00:00.000Z",
      },
    ];
    state.evenings = [
      {
        date: "2026-08-15",
        mood: 7,
        alignment: "aligned",
        oneLine: "ok",
        completedAt: "2026-08-16T02:00:00.000Z",
      },
    ];
    expect(lastActiveDay(state)).toBe("2026-08-16");
  });
});

describe("weekBounds", () => {
  it("returns Sunday–Saturday", () => {
    // 2026-08-10 is a Monday
    const { start, end } = weekBounds("2026-08-10");
    expect(start).toBe("2026-08-09");
    expect(end).toBe("2026-08-15");
  });
});

describe("formatSinceDate", () => {
  it("formats without zero-padding", () => {
    expect(formatSinceDate("2026-08-10")).toBe("8-10-2026");
    expect(formatSinceDate("2026-12-01")).toBe("12-1-2026");
  });
});

describe("ensureMilestonesReached (reach day)", () => {
  it("awards reward milestones when clean days hit the day number", () => {
    let state = baseState();
    // Day 3 of run starting Aug 1 is Aug 3 — no evening needed
    state = ensureMilestonesReached(state, "2026-08-03");
    const days = state.milestones.map((m) => m.dayNumber).sort((a, b) => a - b);
    expect(days).toEqual([1, 2, 3]);
    expect(state.milestones.find((m) => m.dayNumber === 3)?.rewardEligible).toBe(
      true,
    );
  });
});

describe("clean days and return reset", () => {
  it("counts calendar days from run start (Day 1 = start date)", () => {
    const state = baseState();
    // Start date itself is Day 1 — no evening required
    expect(cleanDaysThisRun(state, "2026-08-01")).toBe(1);
    expect(cleanDaysThisRun(state, "2026-08-02")).toBe(2);
    expect(cleanDaysThisRun(state, "2026-08-10")).toBe(10);
    expect(cleanDaysThisRun(state, "2026-07-31")).toBe(0);
  });

  it("resets run after return_to_use and keeps milestone history", () => {
    let state = baseState();
    for (let i = 1; i <= 3; i++) {
      const date = `2026-08-0${i}`;
      state = applyEveningSideEffects(state, {
        date,
        mood: 7,
        stress: 2,
        alignment: "aligned",
        oneLine: `day ${i}`,
        completedAt: new Date().toISOString(),
      });
    }
    expect(cleanDaysThisRun(state, "2026-08-03")).toBe(3);
    expect(state.milestones.some((m) => m.dayNumber === 3)).toBe(true);
    expect(state.reclaimDays).toHaveLength(3);

    state = applyEveningSideEffects(state, {
      date: "2026-08-04",
      mood: 4,
      stress: 8,
      alignment: "return_to_use",
      returnNotes: "stress",
      oneLine: "hard night",
      completedAt: new Date().toISOString(),
    });

    expect(state.returns).toHaveLength(1);
    expect(state.returns[0].previousCleanDays).toBe(3);
    expect(state.profile?.currentRunStartedOn).toBe("2026-08-05");
    // On the return day, new run hasn't started yet → 0 clean days
    expect(cleanDaysThisRun(state, "2026-08-04")).toBe(0);
    // New run Day 1 is the next calendar day
    expect(cleanDaysThisRun(state, "2026-08-05")).toBe(1);
    // history kept
    expect(state.milestones.some((m) => m.dayNumber === 3)).toBe(true);
    // return day does not create reclaim
    expect(state.reclaimDays.some((d) => d.date === "2026-08-04")).toBe(false);
  });

  it("allows re-achieving milestones on a new run", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "1",
      completedAt: "",
    });
    state = applyEveningSideEffects(state, {
      date: "2026-08-02",
      mood: 4,
      stress: 9,
      alignment: "return_to_use",
      oneLine: "storm",
      completedAt: "",
    });
    expect(state.returns[0].previousCleanDays).toBe(1);
    // new run starts 2026-08-03
    state = applyEveningSideEffects(state, {
      date: "2026-08-03",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "again",
      completedAt: "",
    });
    const day1Achieves = state.milestones.filter((m) => m.dayNumber === 1);
    expect(day1Achieves.length).toBe(2);
    expect(new Set(day1Achieves.map((m) => m.runId)).size).toBe(2);
  });
});

describe("ensureElapsedReclaimDays (RB-011)", () => {
  it("credits ended days without evening close", () => {
    const state = baseState();
    // Run started Aug 1; as of Aug 4, Aug 1–3 have ended
    const next = ensureElapsedReclaimDays(state, "2026-08-04");
    expect(next.reclaimDays.map((d) => d.date).sort()).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(waitingReclaimTotal(next)).toBe(120);
    // Today (asOf) is not credited until close or the following day
    expect(next.reclaimDays.some((d) => d.date === "2026-08-04")).toBe(false);
  });

  it("does not credit today on the run start day", () => {
    const state = baseState();
    const next = ensureElapsedReclaimDays(state, "2026-08-01");
    expect(next.reclaimDays).toHaveLength(0);
  });

  it("does not double-credit after evening close then catch-up", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "closed",
      completedAt: "",
    });
    expect(state.reclaimDays).toHaveLength(1);
    state = ensureElapsedReclaimDays(state, "2026-08-02");
    expect(state.reclaimDays).toHaveLength(1);
    expect(state.reclaimDays[0].estimatedAmount).toBe(40);
  });

  it("does not double-credit after catch-up then evening close", () => {
    let state = baseState();
    state = ensureElapsedReclaimDays(state, "2026-08-02");
    expect(state.reclaimDays).toHaveLength(1);
    expect(state.reclaimDays[0].date).toBe("2026-08-01");

    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "backfill",
      completedAt: "",
    });
    expect(state.reclaimDays.filter((d) => d.date === "2026-08-01")).toHaveLength(
      1,
    );
    expect(waitingReclaimTotal(state)).toBe(40);
  });

  it("catches up multiple missed days at once", () => {
    const state = baseState();
    const next = ensureElapsedReclaimDays(state, "2026-08-05");
    expect(next.reclaimDays).toHaveLength(4);
    expect(waitingReclaimTotal(next)).toBe(160);
  });

  it("only credits the current run after a reset", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "1",
      completedAt: "",
    });
    state = resetCurrentRun(state, "2026-08-03");
    expect(state.profile?.currentRunStartedOn).toBe("2026-08-04");

    state = ensureElapsedReclaimDays(state, "2026-08-06");
    // Prior run reclaim kept; new run credits Aug 4–5 only
    const dates = state.reclaimDays.map((d) => d.date).sort();
    expect(dates).toEqual(["2026-08-01", "2026-08-04", "2026-08-05"]);
    expect(state.reclaimDays.some((d) => d.date === "2026-08-02")).toBe(false);
    expect(state.reclaimDays.some((d) => d.date === "2026-08-03")).toBe(false);
  });
});

describe("reclaim transfer", () => {
  it("batches waiting days and writes off toward actual amount", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "a",
      completedAt: "",
    });
    state = applyEveningSideEffects(state, {
      date: "2026-08-02",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "b",
      completedAt: "",
    });
    expect(waitingReclaimTotal(state)).toBe(80);
    state = confirmTransfer(state, ["2026-08-01", "2026-08-02"], 70);
    expect(waitingReclaimTotal(state)).toBe(0);
    expect(state.transfers[0].amount).toBe(70);
  });
});

describe("milestones and projections", () => {
  it("suggests growing reward pools", () => {
    expect(suggestedRewardPool(3, 40)).toBeLessThan(
      suggestedRewardPool(30, 40),
    );
    expect(suggestedRewardPool(30, 40)).toBeLessThan(
      suggestedRewardPool(90, 40),
    );
  });

  it("lists next milestones after current clean days", () => {
    const next = nextMilestones(7, 3);
    expect(next.map((m) => m.dayNumber)).toEqual([10, 14, 21]);
  });

  it("skips checkpoints for next incentive", () => {
    // Day 1 → next milestone is Day 2 checkpoint, but next incentive is Day 3
    expect(nextMilestones(1, 1)[0]?.dayNumber).toBe(2);
    expect(nextIncentive(1)?.dayNumber).toBe(3);
    expect(nextIncentive(1)?.title).toBe("First Win");
    expect(nextIncentive(3)?.dayNumber).toBe(7);
  });

  it("projects reclaim at a future milestone", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "a",
      completedAt: "",
    });
    // As of Aug 1: 1 clean day, $40 waiting → at day 3: waiting 40 + 2*40 = 120
    expect(projectedReclaimAt(state, 3, "2026-08-01")).toBe(120);
  });
});

describe("dashboard label", () => {
  it("uses Day N label from calendar asOf", () => {
    const state = baseState();
    // No evening yet — still Day 1 on the start date
    const dash = buildDashboard(state, "2026-08-01");
    expect(dash?.cleanDays).toBe(1);
    expect(dash?.label).toBe("Day 1");
    expect(dash?.sinceLabel).toBe("Run started 8-1-2026");
  });
});

describe("weekly supports", () => {
  it("creates bonus when all targets hit", () => {
    let state = baseState();
    // Med-only default (RB-033): hit medication 7/wk in Aug 9–15.
    const d = (n: number) => `2026-08-${String(n).padStart(2, "0")}`;
    const completions = [9, 10, 11, 12, 13, 14, 15].map((n) => ({
      date: d(n),
      supportType: "medication" as const,
    }));
    state.supports = completions.map((c) => ({
      ...c,
      completed: true,
      completedAt: "",
    }));
    expect(weekFullyComplete(state, "2026-08-10")).toBe(true);
    state = applyEveningSideEffects(state, {
      date: "2026-08-10",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "strong week",
      completedAt: "",
    });
    expect(state.weeklyBonuses).toHaveLength(1);
    expect(state.weeklyBonuses[0].amount).toBe(20);
  });

  it("does not count skipped supports toward weekly targets", () => {
    let state = baseState();
    state.profile!.supports = [
      {
        type: "meditation",
        label: "Meditation",
        weeklyTarget: 5,
        enabled: true,
      },
    ];
    state.skips = [
      {
        date: "2026-08-10",
        itemKey: "meditation",
        skippedAt: "",
      },
    ];
    // Skipped items are not marked completed — progress stays 0
    const week = weeklySupportProgress(state, "2026-08-10");
    const meditation = week.find((w) => w.type === "meditation");
    expect(meditation?.done).toBe(0);
  });

  it("allows weekly done counts above the target", () => {
    const state = baseState();
    state.profile!.supports = [
      {
        type: "recovery_content",
        label: "Recovery content",
        weeklyTarget: 2,
        enabled: true,
      },
    ];
    // recovery_content weeklyTarget = 2; log 5 days
    state.supports = [0, 1, 2, 3, 4].map((n) => ({
      date: `2026-08-0${n + 1}`,
      supportType: "recovery_content",
      completed: true,
      completedAt: "",
    }));
    // weekBounds for 2026-08-05 is Sun 08-02 – Sat 08-08 → days 2,3,4,5 = 4
    const week = weeklySupportProgress(state, "2026-08-05");
    const content = week.find((w) => w.type === "recovery_content");
    expect(content?.target).toBe(2);
    expect(content?.done).toBe(4);
    expect(content!.done).toBeGreaterThan(content!.target);
  });

  it("counts gym from logged workouts, not support check-offs", () => {
    const state = baseState();
    state.profile!.supports = [
      { type: "gym", label: "Gym", weeklyTarget: 4, enabled: true },
    ];
    state.supports = [
      ...[0, 1, 2].map((n) => ({
        date: `2026-08-3${n}`,
        supportType: "gym" as const,
        completed: true,
        completedAt: "",
      })),
    ];
    state.workouts = [
      {
        id: "w1",
        date: "2026-08-30",
        type: "stretch",
        label: "Mobility",
        quality: 4,
        createdAt: "",
      },
      {
        id: "w2",
        date: "2026-09-01",
        type: "lift",
        label: "Upper",
        quality: 5,
        createdAt: "",
      },
    ];
    const week = weeklySupportProgress(state, "2026-09-01");
    const gym = week.find((w) => w.type === "gym");
    expect(gym?.done).toBe(2);
  });
});

describe("resetCurrentRun (Settings)", () => {
  it("resets climb like return_to_use without needing an evening", () => {
    let state = baseState();
    state = applyEveningSideEffects(state, {
      date: "2026-08-01",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "a",
      completedAt: "",
    });
    state = applyEveningSideEffects(state, {
      date: "2026-08-02",
      mood: 7,
      stress: 2,
      alignment: "aligned",
      oneLine: "b",
      completedAt: "",
    });
    expect(cleanDaysThisRun(state, "2026-08-02")).toBe(2);
    expect(state.reclaimDays).toHaveLength(2);

    state = resetCurrentRun(state, "2026-08-02", "Reset my journey (Settings)");
    expect(state.returns).toHaveLength(1);
    expect(state.returns[0].previousCleanDays).toBe(1);
    expect(state.profile?.currentRunStartedOn).toBe("2026-08-03");
    expect(cleanDaysThisRun(state, "2026-08-02")).toBe(0);
    expect(cleanDaysThisRun(state, "2026-08-03")).toBe(1);
    // history + reclaim preserved
    expect(state.reclaimDays).toHaveLength(2);
    expect(state.evenings).toHaveLength(2);
  });
});

describe("missingEveningDates", () => {
  it("lists open days in the current run, newest first", () => {
    const state = baseState();
    state.evenings = [
      {
        date: "2026-08-01",
        mood: 7,
        alignment: "aligned",
        oneLine: "day 1",
        completedAt: "2026-08-01T04:00:00.000Z",
      },
      {
        date: "2026-08-03",
        mood: 7,
        alignment: "aligned",
        oneLine: "day 3",
        completedAt: "2026-08-03T04:00:00.000Z",
      },
    ];
    expect(missingEveningDates(state, "2026-08-04")).toEqual([
      "2026-08-04",
      "2026-08-02",
    ]);
  });

  it("returns empty when every day in range is closed", () => {
    const state = baseState();
    state.profile!.currentRunStartedOn = "2026-08-02";
    state.evenings = [
      {
        date: "2026-08-02",
        mood: 6,
        alignment: "aligned",
        oneLine: "ok",
        completedAt: "",
      },
      {
        date: "2026-08-03",
        mood: 6,
        alignment: "aligned",
        oneLine: "ok",
        completedAt: "",
      },
    ];
    expect(missingEveningDates(state, "2026-08-03")).toEqual([]);
  });

  it("validates evening dates inside the current run", () => {
    const state = baseState();
    expect(isValidEveningDate(state, "2026-08-01", "2026-08-05")).toBe(true);
    expect(isValidEveningDate(state, "2026-08-05", "2026-08-05")).toBe(true);
    expect(isValidEveningDate(state, "2026-08-06", "2026-08-05")).toBe(false);
    expect(isValidEveningDate(state, "2026-07-31", "2026-08-05")).toBe(false);
    expect(isValidEveningDate(state, "08-01", "2026-08-05")).toBe(false);
  });
});
