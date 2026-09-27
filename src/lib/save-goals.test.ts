import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  amountToGo,
  applySaveGoalAdjustment,
  averageSpendLastDays,
  createSaveGoal,
  dailyIncomeRate,
  daysInMonthForDate,
  inboundPercent,
  leftoverPool,
  projectSaveGoalTargetDate,
  recordSaveGoalDay,
  recomputeSavedAmounts,
  setInboundPercents,
  setSoleDailyTarget,
  splitPoolByWeight,
  updateSaveGoalSettings,
} from "./save-goals";
import type { SaveGoal, SaveGoalDay } from "./types";

describe("dailyIncomeRate", () => {
  it("splits $500 across days in the month", () => {
    expect(daysInMonthForDate("2026-01-15")).toBe(31);
    expect(dailyIncomeRate("2026-01-15", 500)).toBe(16.13);
    expect(daysInMonthForDate("2026-04-01")).toBe(30);
    expect(dailyIncomeRate("2026-04-01", 500)).toBe(16.67);
    expect(daysInMonthForDate("2026-02-10")).toBe(28);
    expect(dailyIncomeRate("2026-02-10", 500)).toBe(17.86);
  });
});

describe("splitPoolByWeight", () => {
  it("splits equally and absorbs residue on last goal", () => {
    const alloc = splitPoolByWeight(10, [
      { id: "a", allocationWeight: 1 },
      { id: "b", allocationWeight: 1 },
      { id: "c", allocationWeight: 1 },
    ]);
    expect(alloc).toEqual([
      { goalId: "a", amount: 3.33 },
      { goalId: "b", amount: 3.33 },
      { goalId: "c", amount: 3.34 },
    ]);
    expect(alloc.reduce((s, a) => s + a.amount, 0)).toBeCloseTo(10, 2);
  });

  it("draws down (negative pool) by weight", () => {
    const alloc = splitPoolByWeight(-20, [
      { id: "a", allocationWeight: 1 },
      { id: "b", allocationWeight: 1 },
    ]);
    expect(alloc).toEqual([
      { goalId: "a", amount: -10 },
      { goalId: "b", amount: -10 },
    ]);
  });
});

describe("inbound percents", () => {
  it("gives first goal 100% of daily inbound", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    expect(inboundPercent(state.saveGoals![0])).toBe(100);
  });

  it("new goal defaults to 0% unless it claims daily inbound", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 200,
      createdOn: "2026-04-01",
    });
    expect(inboundPercent(state.saveGoals!.find((g) => g.name === "Trip")!)).toBe(
      100,
    );
    expect(inboundPercent(state.saveGoals!.find((g) => g.name === "Gift")!)).toBe(
      0,
    );

    state = createSaveGoal(state, {
      name: "General saving",
      targetAmount: 1000,
      createdOn: "2026-04-01",
      claimDailyInbound: true,
    });
    expect(
      inboundPercent(state.saveGoals!.find((g) => g.name === "General saving")!),
    ).toBe(100);
    expect(inboundPercent(state.saveGoals!.find((g) => g.name === "Trip")!)).toBe(
      0,
    );
  });

  it("changing percent shortens or lengthens target date", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "A",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "B",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    const a = () => state.saveGoals!.find((g) => g.name === "A")!;
    const b = () => state.saveGoals!.find((g) => g.name === "B")!;

    state = setInboundPercents(state, { [a().id]: 100, [b().id]: 0 });
    const full = projectSaveGoalTargetDate(state, a(), "2026-04-01");
    state = setInboundPercents(state, { [a().id]: 50, [b().id]: 50 });
    const half = projectSaveGoalTargetDate(state, a(), "2026-04-01");
    expect(full.etaDays).toBeTruthy();
    expect(half.etaDays).toBeTruthy();
    expect(half.etaDays!).toBeGreaterThan(full.etaDays!);
  });
});

describe("recordSaveGoalDay", () => {
  it("sends leftover to the sole daily inbound target", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Hawaii",
      targetAmount: 1000,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 200,
      createdOn: "2026-04-01",
    });

    // Apr daily = 16.67; spend 6.67 → leftover 10 → all to Hawaii (100%)
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 6.67,
      lumpSum: 0,
    });

    const hawaii = state.saveGoals!.find((g) => g.name === "Hawaii")!;
    const gift = state.saveGoals!.find((g) => g.name === "Gift")!;
    expect(hawaii.savedAmount).toBeCloseTo(10, 2);
    expect(gift.savedAmount).toBe(0);

    const day = state.saveGoalDays!.find((d) => d.date === "2026-04-01")!;
    expect(day.dailyIncome).toBe(16.67);
    expect(day.leftover).toBe(10);
  });

  it("can send a custom lump all to one goal while leftover uses preset", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Hawaii",
      targetAmount: 1000,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 200,
      createdOn: "2026-04-01",
    });
    const giftId = state.saveGoals!.find((g) => g.name === "Gift")!.id;

    // leftover 16.67 → Hawaii; lump 50 custom → Gift
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 0,
      lumpSum: 50,
      lumpMode: "custom",
      lumpGoalId: giftId,
    });

    const hawaii = state.saveGoals!.find((g) => g.name === "Hawaii")!;
    const gift = state.saveGoals!.find((g) => g.name === "Gift")!;
    expect(hawaii.savedAmount).toBeCloseTo(16.67, 2);
    expect(gift.savedAmount).toBeCloseTo(50, 2);
  });

  it("allows balances to go negative on overspend", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-01-01",
    });
    state = recordSaveGoalDay(state, {
      date: "2026-01-01",
      spendTotal: 50,
      lumpSum: 0,
    });
    // Jan daily 16.13 − 50 = −33.87
    const trip = state.saveGoals![0];
    expect(trip.savedAmount).toBeCloseTo(-33.87, 2);
    // to go = max(0, target − saved) grows when balance goes under
    expect(amountToGo(trip)).toBeCloseTo(533.87, 2);
  });

  it("replaces the same date and recomputes from ledger", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-01-01",
    });
    state = recordSaveGoalDay(state, {
      date: "2026-01-01",
      spendTotal: 0,
      lumpSum: 100,
    });
    expect(state.saveGoals![0].savedAmount).toBeCloseTo(116.13, 2);

    state = recordSaveGoalDay(state, {
      date: "2026-01-01",
      spendTotal: 0,
      lumpSum: 0,
    });
    expect(state.saveGoalDays).toHaveLength(1);
    expect(state.saveGoals![0].savedAmount).toBeCloseTo(16.13, 2);
  });

  it("applies lump sum on top of leftover", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    // leftover 16.67 + lump 50 = 66.67
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 0,
      lumpSum: 50,
    });
    expect(state.saveGoals![0].savedAmount).toBeCloseTo(66.67, 2);
  });

  it("marks reached when savedAmount hits target", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Small",
      targetAmount: 20,
      createdOn: "2026-04-01",
    });
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 0,
      lumpSum: 10,
    });
    expect(state.saveGoals![0].status).toBe("reached");
  });
});

describe("projectSaveGoalTargetDate", () => {
  it("projects a target date from daily leftover assumption", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    // No spend history → avgSpend 0 → pool = dailyIncome
    const proj = projectSaveGoalTargetDate(state, state.saveGoals![0], "2026-04-01");
    expect(proj.status).toBe("on_track");
    expect(proj.targetDate).toBeTruthy();
    expect(proj.etaDays).toBeGreaterThan(0);
  });

  it("returns needs_leftover when projected pool ≤ 0", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    const spendDays: SaveGoalDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(25 + i).padStart(2, "0")}`,
      dailyIncome: 16,
      spendTotal: 40,
      leftover: -24,
      lumpSum: 0,
      allocations: [],
    }));
    state = { ...state, saveGoalDays: spendDays };
    const proj = projectSaveGoalTargetDate(state, state.saveGoals![0], "2026-04-01");
    expect(proj.status).toBe("needs_leftover");
    expect(proj.targetDate).toBeNull();
  });
});

describe("leftoverPool + recompute", () => {
  it("computes leftover and pool", () => {
    expect(leftoverPool(16.67, 10, 5)).toEqual({ leftover: 6.67, pool: 11.67 });
  });

  it("recomputes saved from all days", () => {
    const goals: SaveGoal[] = [
      {
        id: "a",
        name: "A",
        targetAmount: 50,
        savedAmount: 999,
        createdOn: "2026-01-01",
        status: "active",
        allocationWeight: 1,
      },
    ];
    const days: SaveGoalDay[] = [
      {
        date: "2026-01-01",
        dailyIncome: 16,
        spendTotal: 0,
        leftover: 16,
        lumpSum: 0,
        allocations: [{ goalId: "a", amount: 16 }],
      },
      {
        date: "2026-01-02",
        dailyIncome: 16,
        spendTotal: 20,
        leftover: -4,
        lumpSum: 0,
        allocations: [{ goalId: "a", amount: -4 }],
      },
    ];
    expect(recomputeSavedAmounts(goals, days)[0].savedAmount).toBe(12);
  });
});

describe("averageSpendLastDays", () => {
  it("averages most recent days at or before today", () => {
    const days: SaveGoalDay[] = [
      {
        date: "2026-04-01",
        dailyIncome: 16,
        spendTotal: 10,
        leftover: 6,
        lumpSum: 0,
        allocations: [],
      },
      {
        date: "2026-04-02",
        dailyIncome: 16,
        spendTotal: 20,
        leftover: -4,
        lumpSum: 0,
        allocations: [],
      },
    ];
    expect(averageSpendLastDays(days, "2026-04-02", 7)).toBe(15);
  });
});

describe("applySaveGoalAdjustment", () => {
  it("bulk add uses preset chips; custom can target one area", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 200,
      createdOn: "2026-04-01",
    });
    const trip = () => state.saveGoals!.find((g) => g.name === "Trip")!;
    const gift = () => state.saveGoals!.find((g) => g.name === "Gift")!;

    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: 40,
      mode: "preset",
    });
    expect(trip().savedAmount).toBeCloseTo(40, 2);
    expect(gift().savedAmount).toBe(0);

    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: -10,
      mode: "custom",
      goalId: gift().id,
    });
    expect(gift().savedAmount).toBeCloseTo(-10, 2);
    expect(trip().savedAmount).toBeCloseTo(40, 2);
  });

  it("setSoleDailyTarget moves 100% inbound", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 200,
      createdOn: "2026-04-01",
    });
    const giftId = state.saveGoals!.find((g) => g.name === "Gift")!.id;
    state = setSoleDailyTarget(state, giftId);
    expect(inboundPercent(state.saveGoals!.find((g) => g.name === "Gift")!)).toBe(
      100,
    );
    expect(inboundPercent(state.saveGoals!.find((g) => g.name === "Trip")!)).toBe(
      0,
    );
  });
});
