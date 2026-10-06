import { describe, expect, it } from "vitest";
import { addDays, emptyState } from "./journey";
import {
  amountToGo,
  applySaveGoalAdjustment,
  averageSpendLastDays,
  createSaveGoal,
  dailyIncomeRate,
  daysInMonthForDate,
  addSaveGoalSpend,
  applySaveGoalDayTotals,
  applySaveGoalRolledOnly,
  formatTargetDateLabel,
  setSaveGoalSavedAmount,
  deleteSaveGoal,
  listRolledOpenDatesBefore,
  saveGoalCloseForDate,
  undoApplySaveGoalDayTotals,
  ensureElapsedSaveGoalDays,
  ensureSaveGoalDay,
  inboundPercent,
  leftoverBeforeApply,
  leftoverPool,
  listSaveGoalAdjustments,
  listSaveGoalAdjustmentsForGoal,
  normalizeSaveGoals,
  projectSaveGoalTargetDate,
  recordSaveGoalDay,
  recomputeSavedAmounts,
  removeSaveGoalAdjustment,
  removeSaveGoalSpend,
  clearSaveGoalDaySpend,
  formatCalendarMonthLabel,
  groupSaveGoalClosesByMonth,
  SAVE_GOAL_HISTORY_EPOCH,
  SAVE_GOAL_LEDGER_START,
  setGoalInboundPercent,
  setInboundPercents,
  setSaveGoalDayInbound,
  setSoleDailyTarget,
  spendCategoryLabelsForDate,
  spendTotalForDate,
  splitPoolByWeight,
  saveGoalSpendEntryLabel,
  summarizeSaveGoalMonth,
  updateSaveGoal,
  updateSaveGoalSettings,
} from "./save-goals";
import type { SaveGoal, SaveGoalDay } from "./types";

describe("dailyIncomeRate", () => {
  it("splits $500 across days in the month", () => {
    expect(daysInMonthForDate("2026-01-15")).toBe(31);
    expect(dailyIncomeRate("2026-01-15", 500)).toBe(16);
    expect(daysInMonthForDate("2026-04-01")).toBe(30);
    expect(dailyIncomeRate("2026-04-01", 500)).toBe(16);
    expect(daysInMonthForDate("2026-02-10")).toBe(28);
    expect(dailyIncomeRate("2026-02-10", 500)).toBe(17);
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
    expect(alloc.reduce((s, a) => s + a.amount, 0)).toBe(10);
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

    // Apr daily = $16 (floored); spend keeps cents → leftover 9.33 → Hawaii 100%
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 6.67,
      lumpSum: 0,
    });

    const hawaii = state.saveGoals!.find((g) => g.name === "Hawaii")!;
    const gift = state.saveGoals!.find((g) => g.name === "Gift")!;
    expect(hawaii.savedAmount).toBeCloseTo(9.33, 2);
    expect(gift.savedAmount).toBe(0);

    const day = state.saveGoalDays!.find((d) => d.date === "2026-04-01")!;
    expect(day.dailyIncome).toBe(16);
    expect(day.leftover).toBeCloseTo(9.33, 2);
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

    // leftover 16 → Hawaii; lump 50 custom → Gift
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 0,
      lumpSum: 50,
      lumpMode: "custom",
      lumpGoalId: giftId,
    });

    const hawaii = state.saveGoals!.find((g) => g.name === "Hawaii")!;
    const gift = state.saveGoals!.find((g) => g.name === "Gift")!;
    expect(hawaii.savedAmount).toBe(16);
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
    // Jan daily 16 − 50 = −34
    const trip = state.saveGoals![0];
    expect(trip.savedAmount).toBe(-34);
    // to go = max(0, target − saved) grows when balance goes under
    expect(amountToGo(trip)).toBe(534);
  });

  it("draws overspend from the chosen goal when negative", () => {
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
    state = setInboundPercents(state, {
      [trip().id]: 50,
      [gift().id]: 50,
    });

    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 40,
      kind: "spend",
      category: "meals",
    });
    // inbound 16 − 40 = −24; must pick
    expect(() =>
      applySaveGoalDayTotals(state, { date: "2026-04-01" }),
    ).toThrow(/Pick a goal to take from/);

    state = applySaveGoalDayTotals(state, {
      date: "2026-04-01",
      drawFromGoalId: gift().id,
    });
    expect(gift().savedAmount).toBe(-24);
    expect(trip().savedAmount).toBe(0);
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
    expect(state.saveGoals![0].savedAmount).toBe(116);

    state = recordSaveGoalDay(state, {
      date: "2026-01-01",
      spendTotal: 0,
      lumpSum: 0,
    });
    expect(state.saveGoalDays).toHaveLength(1);
    expect(state.saveGoals![0].savedAmount).toBe(16);
  });

  it("applies lump sum on top of leftover", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Gift",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    // leftover 16 + lump 50 = 66
    state = recordSaveGoalDay(state, {
      date: "2026-04-01",
      spendTotal: 0,
      lumpSum: 50,
    });
    expect(state.saveGoals![0].savedAmount).toBe(66);
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
  it("projects a target date from daily rate × inbound %", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 100,
      createdOn: "2026-04-01",
    });
    const proj = projectSaveGoalTargetDate(state, state.saveGoals![0], "2026-04-01");
    expect(proj.status).toBe("on_track");
    expect(proj.targetDate).toBeTruthy();
    expect(proj.goalDaily).toBe(16); // $16 × 100%
    // Today not applied → remaining after today’s $16 credit = 84 → 84/16 = 5.25 → 6 days
    expect(proj.etaDays).toBe(6);
  });

  it("uses $16 × 20% = $3.20/day for Reserve (not Left, not net of spend)", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 3000,
      createdOn: "2026-09-01",
    });
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 1000,
      createdOn: "2026-09-01",
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => state.saveGoals!.find((g) => g.name === "Reserve")!;
    state = setInboundPercents(state, {
      [general().id]: 80,
      [reserve().id]: 20,
    });
    state = setSaveGoalSavedAmount(state, {
      id: reserve().id,
      savedAmount: 14.94,
      date: "2026-09-28",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-09-28",
      amount: 34,
      kind: "add",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-09-28",
      amount: 9.72,
      kind: "spend",
      category: "meals",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-09-28" });

    const proj = projectSaveGoalTargetDate(state, reserve(), "2026-09-28");
    expect(proj.projectedPoolPerDay).toBe(16);
    expect(proj.goalDaily).toBe(3.2);
    // ~$985 left / $3.20 ≈ 308 days → 2027-08-02 (not “Nov 18” without a year)
    expect(proj.etaDays).toBe(Math.ceil(proj.remaining / 3.2));
    expect(proj.targetDate).toBe(
      addDays("2026-09-28", proj.etaDays!),
    );
    expect(formatTargetDateLabel(proj.targetDate!)).toMatch(/2027/);
  });

  it("updates pace when inbound % changes", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 3000,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 1000,
      createdOn: "2026-04-01",
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => state.saveGoals!.find((g) => g.name === "Reserve")!;
    state = setInboundPercents(state, {
      [general().id]: 80,
      [reserve().id]: 20,
    });
    const at80 = projectSaveGoalTargetDate(state, general(), "2026-04-01");
    expect(at80.goalDaily).toBe(12.8); // 16 × 80%
    expect(at80.targetDate).toBeTruthy();

    state = setInboundPercents(state, {
      [general().id]: 50,
      [reserve().id]: 50,
    });
    const at50 = projectSaveGoalTargetDate(state, general(), "2026-04-01");
    expect(at50.goalDaily).toBe(8);
    expect(at50.etaDays!).toBeGreaterThan(at80.etaDays!);
  });

  it("ignores one-time adds and spend when computing daily pace", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-02",
      amount: 34,
      kind: "add",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-02",
      amount: 9.72,
      kind: "spend",
      category: "meals",
    });
    const proj = projectSaveGoalTargetDate(state, state.saveGoals![0], "2026-04-02");
    expect(proj.projectedPoolPerDay).toBe(16);
    expect(proj.goalDaily).toBe(16);
    expect(proj.targetDate).toBeTruthy();
  });
});

describe("leftoverPool + recompute", () => {
  it("computes leftover and pool", () => {
    expect(leftoverPool(16, 10, 5)).toEqual({ leftover: 6, pool: 11 });
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
  it("does not auto-credit — unapplied leftover rolls instead", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = ensureElapsedSaveGoalDays(state, "2026-04-03");
    const closes = (state.saveGoalDays ?? []).filter(
      (d) => (d.kind ?? "close") === "close",
    );
    expect(closes).toHaveLength(0);
    expect(state.saveGoals![0].savedAmount).toBe(0);
    // Apr 1 + Apr 2 rates roll into Apr 3 pool
    const day3 = leftoverBeforeApply(state, "2026-04-03");
    expect(day3.carryIn).toBe(32);
    expect(day3.inbound).toBe(48);
  });

  it("stops rolling after a day is applied", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(state.saveGoals![0].savedAmount).toBe(16);
    const day2 = leftoverBeforeApply(state, "2026-04-02");
    expect(day2.carryIn).toBe(0);
    expect(day2.inbound).toBe(16);
  });
});

describe("leftoverBeforeApply roll-forward", () => {
  it("rolls unapplied left into the next day total", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = addSaveGoalSpend(state, { date: "2026-04-01", amount: 5, category: "meals" });
    const d1 = leftoverBeforeApply(state, "2026-04-01");
    expect(d1.left).toBe(11);
    const d2 = leftoverBeforeApply(state, "2026-04-02");
    expect(d2.carryIn).toBe(11);
    expect(d2.inbound).toBe(27);
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

  it("stores an optional reason on adjust rows through normalize", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalAdjustment(state, {
      date: "2026-04-02",
      amount: 60,
      mode: "preset",
      note: "  Birthday gift  ",
    });
    const adj = listSaveGoalAdjustments(state)[0];
    expect(adj?.note).toBe("Birthday gift");

    state = normalizeSaveGoals(state);
    expect(listSaveGoalAdjustments(state)[0]?.note).toBe("Birthday gift");
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
  it("custom apply sends all leftover to one goal", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => state.saveGoals!.find((g) => g.name === "Reserve")!;
    state = setInboundPercents(state, {
      [general().id]: 80,
      [reserve().id]: 20,
    });

    state = applySaveGoalDayTotals(state, {
      date: "2026-04-01",
      leftoverMode: "custom",
      leftoverGoalId: reserve().id,
    });
    expect(reserve().savedAmount).toBe(16);
    expect(general().savedAmount).toBe(0);
  });

  it("custom apply accepts an explicit dollar split", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-04-01",
    });
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => state.saveGoals!.find((g) => g.name === "Reserve")!;
    state = setInboundPercents(state, {
      [general().id]: 80,
      [reserve().id]: 20,
    });

    state = applySaveGoalDayTotals(state, {
      date: "2026-04-01",
      leftoverMode: "custom",
      leftoverAllocations: [
        { goalId: general().id, amount: 10 },
        { goalId: reserve().id, amount: 6 },
      ],
    });
    expect(general().savedAmount).toBe(10);
    expect(reserve().savedAmount).toBe(6);
  });

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

    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 5,
      category: "meals",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 3,
      category: "clothes",
    });
    const before = leftoverBeforeApply(state, "2026-04-01");
    expect(before.inbound).toBe(16);
    expect(before.spend).toBe(8);
    expect(before.adds).toBe(0);
    expect(before.left).toBe(8);

    const entryId = state.saveGoalSpendEntries![0].id;
    state = removeSaveGoalSpend(state, entryId);
    expect(leftoverBeforeApply(state, "2026-04-01").spend).toBe(3);

    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(trip().savedAmount).toBe(6.5);
    expect(gift().savedAmount).toBe(6.5);
    const close = state.saveGoalDays!.find(
      (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
    )!;
    expect(close.spendTotal).toBe(3);
    expect(close.leftover).toBe(13);
  });

  it("keeps cents on subtract amounts and leftover math", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    // Daily rate still floors ($500/30 → $16)
    expect(leftoverBeforeApply(state, "2026-04-01").base).toBe(16);

    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 8.18,
      kind: "spend",
      category: "meals",
    });
    const before = leftoverBeforeApply(state, "2026-04-01");
    expect(before.spend).toBe(8.18);
    expect(before.left).toBe(7.82);
    expect(state.saveGoalSpendEntries![0].amount).toBe(8.18);
  });

  it("requires a category on subtract", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    expect(() =>
      addSaveGoalSpend(state, {
        date: "2026-04-01",
        amount: 5,
        kind: "spend",
      }),
    ).toThrow(/Pick a category/);
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 5,
      kind: "spend",
      category: "entertainment",
    });
    expect(state.saveGoalSpendEntries![0].category).toBe("entertainment");

    // Legacy ids still accepted and rewritten to the new set.
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 2,
      kind: "spend",
      category: "food",
    });
    expect(state.saveGoalSpendEntries![1].category).toBe("meals");
    expect(spendCategoryLabelsForDate(state, "2026-04-01")).toEqual([
      "Entertainment",
      "Meals",
    ]);
  });

  it("Other spend can carry a free-text note in the label", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 8.18,
      kind: "spend",
      category: "other",
      note: "  parking meter  ",
    });
    expect(state.saveGoalSpendEntries![0].note).toBe("parking meter");
    expect(saveGoalSpendEntryLabel(state.saveGoalSpendEntries![0])).toBe(
      "Other · parking meter",
    );
    expect(spendCategoryLabelsForDate(state, "2026-04-01")).toEqual([
      "Other · parking meter",
    ]);
  });

  it("manual adds increase day total and leftover", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });

    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 20,
      kind: "add",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 5,
      kind: "spend",
      category: "other",
    });
    const before = leftoverBeforeApply(state, "2026-04-01");
    expect(before.inbound).toBe(16);
    expect(before.adds).toBe(20);
    expect(before.spend).toBe(5);
    expect(before.left).toBe(31);

    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    const close = state.saveGoalDays!.find(
      (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
    )!;
    expect(close.dailyIncome).toBe(36);
    expect(close.spendTotal).toBe(5);
    expect(close.leftover).toBe(31);
    expect(state.saveGoals![0].savedAmount).toBe(31);
  });

  it("undoes apply so leftover rolls and saved amounts reverse", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(state.saveGoals![0].savedAmount).toBe(16);
    expect(
      state.saveGoalDays!.some(
        (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
      ),
    ).toBe(true);

    state = undoApplySaveGoalDayTotals(state, "2026-04-01");
    expect(state.saveGoals![0].savedAmount).toBe(0);
    expect(
      state.saveGoalDays!.some(
        (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
      ),
    ).toBe(false);
    expect(leftoverBeforeApply(state, "2026-04-01").left).toBe(16);
  });

  it("clearDaySpend removes spend and undoes apply for that date", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 96,
      kind: "spend",
      category: "meals",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(state.saveGoals![0].savedAmount).toBe(-80);
    expect(spendTotalForDate(state, "2026-04-01")).toBe(96);

    state = clearSaveGoalDaySpend(state, "2026-04-01");
    expect(spendTotalForDate(state, "2026-04-01")).toBe(0);
    expect(saveGoalCloseForDate(state, "2026-04-01")).toBeNull();
    expect(state.saveGoals![0].savedAmount).toBe(0);
  });

  it("applies only rolled history and leaves today open", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    // Apr 1 + Apr 2 unapplied → Apr 3 carryIn 32
    expect(leftoverBeforeApply(state, "2026-04-03").carryIn).toBe(32);
    expect(leftoverBeforeApply(state, "2026-04-03").left).toBe(48);
    expect(listRolledOpenDatesBefore(state, "2026-04-03")).toEqual([
      "2026-04-01",
      "2026-04-02",
    ]);

    state = applySaveGoalRolledOnly(state, { date: "2026-04-03" });
    expect(state.saveGoals![0].savedAmount).toBe(32);
    expect(saveGoalCloseForDate(state, "2026-04-03")).toBeNull();
    const today = leftoverBeforeApply(state, "2026-04-03");
    expect(today.carryIn).toBe(0);
    expect(today.left).toBe(16);
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
    // Remaining 30 split by prior B:C = 40:20 → 20 and 10
    expect(inboundPercent(b())).toBe(20);
    expect(inboundPercent(c())).toBe(10);
    const sum =
      inboundPercent(a()) + inboundPercent(b()) + inboundPercent(c());
    expect(sum).toBe(100);
  });

  it("sets saved total via a ledger adjust delta", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(state.saveGoals![0].savedAmount).toBe(16);

    state = setSaveGoalSavedAmount(state, {
      id: state.saveGoals![0].id,
      savedAmount: 49,
      date: "2026-04-01",
    });
    expect(state.saveGoals![0].savedAmount).toBe(49);

    state = setSaveGoalSavedAmount(state, {
      id: state.saveGoals![0].id,
      savedAmount: 40,
      date: "2026-04-01",
    });
    expect(state.saveGoals![0].savedAmount).toBe(40);
  });

  it("always keeps inbound percents at 100 when decreasing a share", () => {
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
    expect(inboundPercent(gift())).toBe(40);
    state = setGoalInboundPercent(state, trip().id, 59);
    expect(inboundPercent(trip())).toBe(59);
    expect(inboundPercent(gift())).toBe(41);
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

describe("ledger start Oct 1 2026 + month rollups", () => {
  it("history epoch wipe clears all ledger rows once for manual true-up", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-10-01" });
    state = setSaveGoalDayInbound(state, { date: "2026-10-02", amount: 11 });
    expect(saveGoalCloseForDate(state, "2026-10-01")).not.toBeNull();
    expect(state.saveGoals![0].savedAmount).toBeGreaterThan(0);

    const stale = {
      ...state,
      saveGoalSettings: {
        ...state.saveGoalSettings!,
        historyEpoch: 0,
      },
    };
    state = normalizeSaveGoals(stale);
    expect(state.saveGoalDays).toEqual([]);
    expect(state.saveGoalSpendEntries).toEqual([]);
    expect(state.saveGoalInboundByDate).toEqual({});
    expect(state.saveGoals![0].savedAmount).toBe(0);
    expect(state.saveGoalSettings!.historyEpoch).toBe(SAVE_GOAL_HISTORY_EPOCH);
  });

  it("setInbound overwrites the default daily rate for that date", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    expect(leftoverBeforeApply(state, "2026-10-01").base).toBe(
      dailyIncomeRate("2026-10-01", 500),
    );
    state = setSaveGoalDayInbound(state, { date: "2026-10-01", amount: 12.5 });
    expect(leftoverBeforeApply(state, "2026-10-01").base).toBe(12.5);
    expect(leftoverBeforeApply(state, "2026-10-01").inbound).toBe(12.5);
    expect(state.saveGoalInboundByDate?.["2026-10-01"]).toBe(12.5);
  });

  it("normalize drops all September closes/spends and bumps createdOn to Oct 1", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-09-15",
    });
    expect(state.saveGoals![0].createdOn).toBe(SAVE_GOAL_LEDGER_START);

    state = applySaveGoalDayTotals(state, { date: "2026-10-01" });
    const goalId = state.saveGoals![0].id;
    const junked = {
      ...state,
      saveGoals: state.saveGoals!.map((g) => ({
        ...g,
        createdOn: "2026-09-29",
      })),
      saveGoalDays: [
        ...(state.saveGoalDays ?? []),
        {
          date: "2026-09-15",
          dailyIncome: 7,
          spendTotal: 0,
          leftover: 7,
          lumpSum: 0,
          allocations: [{ goalId, amount: 5.6 }],
          kind: "close" as const,
        },
        {
          date: "2026-09-29",
          dailyIncome: 16,
          spendTotal: 0,
          leftover: 16,
          lumpSum: 0,
          allocations: [{ goalId, amount: 12.8 }],
          kind: "close" as const,
        },
        {
          date: "2026-09-30",
          dailyIncome: 16,
          spendTotal: 0,
          leftover: 16,
          lumpSum: 0,
          allocations: [{ goalId, amount: 12.8 }],
          kind: "close" as const,
        },
      ],
      saveGoalSpendEntries: [
        {
          id: "junk-sep30",
          date: "2026-09-30",
          amount: 3,
          kind: "spend" as const,
          category: "meals" as const,
        },
      ],
    };
    expect(
      junked.saveGoalDays.filter((d) => d.date.startsWith("2026-09")),
    ).toHaveLength(3);

    state = normalizeSaveGoals(junked);
    expect(saveGoalCloseForDate(state, "2026-09-15")).toBeNull();
    expect(saveGoalCloseForDate(state, "2026-09-29")).toBeNull();
    expect(saveGoalCloseForDate(state, "2026-09-30")).toBeNull();
    expect(spendTotalForDate(state, "2026-09-30")).toBe(0);
    expect(saveGoalCloseForDate(state, "2026-10-01")).not.toBeNull();
    expect(state.saveGoals![0].createdOn).toBe(SAVE_GOAL_LEDGER_START);
    expect(state.saveGoals![0].savedAmount).toBe(
      saveGoalCloseForDate(state, "2026-10-01")!.allocations[0].amount,
    );
  });

  it("summarizes applied-by-goal and spend-by-category for a month", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    state = createSaveGoal(state, {
      name: "Reserve",
      targetAmount: 500,
      createdOn: "2026-10-01",
      claimDailyInbound: false,
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => state.saveGoals!.find((g) => g.name === "Reserve")!;
    state = setInboundPercents(state, {
      [general().id]: 80,
      [reserve().id]: 20,
    });

    state = addSaveGoalSpend(state, {
      date: "2026-10-02",
      amount: 5,
      kind: "spend",
      category: "meals",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-10-02",
      amount: 2,
      kind: "spend",
      category: "entertainment",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-10-01" });
    state = applySaveGoalDayTotals(state, { date: "2026-10-02" });

    const summary = summarizeSaveGoalMonth(state, "2026-10");
    expect(formatCalendarMonthLabel("2026-10")).toBe("October 2026");
    expect(summary.days).toHaveLength(2);
    expect(summary.appliedByGoalId[general().id]).toBeGreaterThan(0);
    expect(summary.appliedByGoalId[reserve().id]).toBeGreaterThan(0);
    expect(summary.spendByCategory.meals).toBe(5);
    expect(summary.spendByCategory.entertainment).toBe(2);
  });

  it("groups prior closes: current month expanded, past months collapsible", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-10-01" });
    state = applySaveGoalDayTotals(state, { date: "2026-10-02" });
    state = applySaveGoalDayTotals(state, { date: "2026-11-01" });
    state = applySaveGoalDayTotals(state, { date: "2026-11-02" });

    const groups = groupSaveGoalClosesByMonth(state, "2026-11-06");
    expect(groups.map((g) => g.monthKey)).toEqual(["2026-11", "2026-10"]);
    expect(groups[0].isCurrentMonth).toBe(true);
    expect(groups[0].summary.days.map((d) => d.date)).toEqual([
      "2026-11-02",
      "2026-11-01",
    ]);
    expect(groups[1].isCurrentMonth).toBe(false);
    expect(groups[1].summary.days).toHaveLength(2);
  });
});
