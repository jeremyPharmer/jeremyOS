import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  amountToGo,
  applySaveGoalAdjustment,
  averageSpendLastDays,
  createSaveGoal,
  dailyIncomeRate,
  daysInMonthForDate,
  addSaveGoalSpend,
  applySaveGoalDayTotals,
  deleteSaveGoal,
  ensureElapsedSaveGoalDays,
  ensureSaveGoalDay,
  inboundPercent,
  leftoverBeforeApply,
  leftoverPool,
  listSaveGoalAdjustments,
  listSaveGoalAdjustmentsForGoal,
  projectSaveGoalTargetDate,
  recordSaveGoalDay,
  recomputeSavedAmounts,
  removeSaveGoalAdjustment,
  removeSaveGoalSpend,
  setGoalInboundPercent,
  setInboundPercents,
  setSoleDailyTarget,
  splitPoolByWeight,
  updateSaveGoal,
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

describe("ensureElapsedSaveGoalDays", () => {
  it("auto-credits missed days with full daily inbound", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    // As of Apr 3 → catch up Apr 1 and Apr 2 (not today)
    state = ensureElapsedSaveGoalDays(state, "2026-04-03");
    const closes = (state.saveGoalDays ?? []).filter(
      (d) => (d.kind ?? "close") === "close",
    );
    expect(closes.map((d) => d.date).sort()).toEqual([
      "2026-04-01",
      "2026-04-02",
    ]);
    expect(closes.every((d) => d.source === "auto")).toBe(true);
    expect(closes.every((d) => d.spendTotal === 0)).toBe(true);
    // two days × 16.67
    expect(state.saveGoals![0].savedAmount).toBeCloseTo(33.34, 2);
  });

  it("does not overwrite a manual approve", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 10,
      lumpSum: 0,
      source: "manual",
    });
    state = ensureSaveGoalDay(state, "2026-04-01");
    const day = state.saveGoalDays!.find((d) => d.date === "2026-04-01")!;
    expect(day.source).toBe("manual");
    expect(day.spendTotal).toBe(10);
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

describe("removeSaveGoalAdjustment", () => {
  it("undoes a one-time adjust by id", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: 40,
      mode: "preset",
    });
    const adj = listSaveGoalAdjustments(state)[0];
    expect(adj?.id).toBeTruthy();
    expect(state.saveGoals![0].savedAmount).toBeCloseTo(40, 2);

    state = removeSaveGoalAdjustment(state, adj.id!);
    expect(state.saveGoals![0].savedAmount).toBe(0);
    expect(listSaveGoalAdjustments(state)).toHaveLength(0);
  });
});

describe("updateSaveGoal", () => {
  it("edits name and target amount", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    const id = state.saveGoals![0].id;
    state = updateSaveGoal(state, {
      id,
      name: "Hawaii",
      targetAmount: 800,
    });
    expect(state.saveGoals![0].name).toBe("Hawaii");
    expect(state.saveGoals![0].targetAmount).toBe(800);
  });
});

describe("addSaveGoalSpend + applySaveGoalDayTotals", () => {
  it("subtracts through the day then applies leftover by inbound %", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
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
    state = setInboundPercents(state, {
      [trip().id]: 50,
      [gift().id]: 50,
    });

    state = addSaveGoalSpend(state, { date: "2026-04-01", amount: 5 });
    state = addSaveGoalSpend(state, { date: "2026-04-01", amount: 3 });
    const before = leftoverBeforeApply(state, "2026-04-01");
    expect(before.inbound).toBe(16.67);
    expect(before.spend).toBe(8);
    expect(before.left).toBeCloseTo(8.67, 2);

    const entryId = state.saveGoalSpendEntries![0].id;
    state = removeSaveGoalSpend(state, entryId);
    expect(leftoverBeforeApply(state, "2026-04-01").spend).toBe(3);

    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(trip().savedAmount).toBeCloseTo(6.84, 1);
    expect(gift().savedAmount).toBeCloseTo(6.83, 1);
    const close = state.saveGoalDays!.find(
      (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
    )!;
    expect(close.spendTotal).toBe(3);
    expect(close.leftover).toBeCloseTo(13.67, 2);
  });
});

describe("setGoalInboundPercent", () => {
  it("equally down-adjusts others when total would exceed 100", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "A",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "B",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "C",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    const a = () => state.saveGoals!.find((g) => g.name === "A")!;
    const b = () => state.saveGoals!.find((g) => g.name === "B")!;
    const c = () => state.saveGoals!.find((g) => g.name === "C")!;

    state = setInboundPercents(state, {
      [a().id]: 40,
      [b().id]: 40,
      [c().id]: 20,
    });
    state = setGoalInboundPercent(state, a().id, 70);
    expect(inboundPercent(a())).toBe(70);
    expect(inboundPercent(b())).toBe(25);
    expect(inboundPercent(c())).toBe(5);
    const sum =
      inboundPercent(a()) + inboundPercent(b()) + inboundPercent(c());
    expect(sum).toBeCloseTo(100, 1);
  });

  it("allows under-100 totals when decreasing a share", () => {
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
    state = setGoalInboundPercent(state, trip().id, 60);
    expect(inboundPercent(trip())).toBe(60);
    expect(inboundPercent(gift())).toBe(0);
  });
});

describe("listSaveGoalAdjustmentsForGoal", () => {
  it("returns only adjustments that touched the goal", () => {
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
      mode: "custom",
      goalId: trip().id,
    });
    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: 10,
      mode: "custom",
      goalId: gift().id,
    });
    const tripRows = listSaveGoalAdjustmentsForGoal(state, trip().id);
    expect(tripRows).toHaveLength(1);
    expect(tripRows[0].goalAmount).toBeCloseTo(40, 2);
    expect(listSaveGoalAdjustmentsForGoal(state, gift().id)).toHaveLength(1);
  });
});

describe("deleteSaveGoal", () => {
  it("archives without reallocate", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: 40,
      mode: "preset",
    });
    const id = state.saveGoals![0].id;
    state = deleteSaveGoal(state, { id, date: "2026-04-03" });
    expect(state.saveGoals!.find((g) => g.id === id)?.status).toBe("archived");
    expect(state.saveGoals!.find((g) => g.id === id)?.savedAmount).toBeCloseTo(
      40,
      2,
    );
  });

  it("reallocates balance to another goal then archives", () => {
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
      mode: "custom",
      goalId: trip().id,
    });
    expect(trip().savedAmount).toBeCloseTo(40, 2);

    state = deleteSaveGoal(state, {
      id: trip().id,
      date: "2026-04-03",
      reallocateToGoalId: gift().id,
    });
    expect(trip().status).toBe("archived");
    expect(trip().savedAmount).toBeCloseTo(0, 2);
    expect(gift().status).toBe("active");
    expect(gift().savedAmount).toBeCloseTo(40, 2);
    expect(inboundPercent(gift())).toBe(100);
  });
});
