import { describe, expect, it } from "vitest";
import { addDays, emptyState } from "./journey";
import {
  amountToGo,
  applySaveGoalAdjustment,
  averageSpendLastDays,
  createSaveGoal,
  creditSaveGoalReserve,
  dailyIncomeRate,
  daysInMonthForDate,
  addSaveGoalSpend,
  applySaveGoalDayTotals,
  applySaveGoalRolledOnly,
  findReserveGoal,
  formatTargetDateLabel,
  setSaveGoalSavedAmount,
  deleteSaveGoal,
  isReserveGoal,
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
  transferSaveGoalFromReserve,
  updateSaveGoal,
  removeSaveGoalSpend,
  clearSaveGoalDaySpend,
  formatCalendarMonthLabel,
  groupSaveGoalClosesByMonth,
  groupSaveGoalExpensesByDay,
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

  it("changing fixed $/day shortens or lengthens target date", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "A",
      targetAmount: 500,
      createdOn: "2026-04-01",
      dollarsPerDay: 10,
    });
    const a = () => state.saveGoals!.find((g) => g.name === "A")!;
    const full = projectSaveGoalTargetDate(state, a(), "2026-04-01");
    state = updateSaveGoal(state, { id: a().id, dollarsPerDay: 5 });
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

    // Legacy pool spend (no reserveAdjustId) still hits leftover.
    state = normalizeSaveGoals({
      ...state,
      saveGoalSpendEntries: [
        {
          id: "sgs_legacy",
          date: "2026-04-01",
          amount: 40,
          kind: "spend",
          category: "meals",
        },
      ],
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
  it("projects a target date from fixed $/day", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 100,
      createdOn: "2026-04-01",
      dollarsPerDay: 10,
    });
    const trip = state.saveGoals!.find((g) => g.name === "Trip")!;
    const proj = projectSaveGoalTargetDate(state, trip, "2026-04-01");
    expect(proj.status).toBe("on_track");
    expect(proj.goalDaily).toBe(10);
    expect(proj.etaDays).toBe(10); // 100 / 10
    expect(proj.targetDate).toBe(addDays("2026-04-01", 10));
  });

  it("Reserve has no payoff ETA (holding tank)", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "City",
      targetAmount: 2900,
      createdOn: "2026-10-01",
      dollarsPerDay: 10,
    });
    const reserve = findReserveGoal(state)!;
    expect(isReserveGoal(reserve)).toBe(true);
    state = creditSaveGoalReserve(state, {
      date: "2026-10-01",
      amount: 100,
    });
    const proj = projectSaveGoalTargetDate(
      state,
      findReserveGoal(state)!,
      "2026-10-01",
    );
    expect(proj.targetDate).toBeNull();
    expect(proj.etaDays).toBeNull();
    expect(proj.goalDaily).toBe(0);
  });

  it("updates ETA when fixed $/day changes", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "City",
      targetAmount: 2900,
      createdOn: "2026-04-01",
      dollarsPerDay: 10,
    });
    const city = () => state.saveGoals!.find((g) => g.name === "City")!;
    const at10 = projectSaveGoalTargetDate(state, city(), "2026-04-01");
    expect(at10.goalDaily).toBe(10);
    expect(at10.targetDate).toBeTruthy();

    state = updateSaveGoal(state, { id: city().id, dollarsPerDay: 5 });
    const at5 = projectSaveGoalTargetDate(state, city(), "2026-04-01");
    expect(at5.goalDaily).toBe(5);
    expect(at5.etaDays!).toBeGreaterThan(at10.etaDays!);
  });

  it("transfer from Reserve moves ETA earlier", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "City",
      targetAmount: 100,
      createdOn: "2026-04-01",
      dollarsPerDay: 10,
    });
    const city = () => state.saveGoals!.find((g) => g.name === "City")!;
    state = creditSaveGoalReserve(state, { date: "2026-04-01", amount: 40 });
    const before = projectSaveGoalTargetDate(state, city(), "2026-04-01");
    expect(before.etaDays).toBe(10);

    state = transferSaveGoalFromReserve(state, {
      date: "2026-04-01",
      amount: 40,
      toGoalId: city().id,
    });
    const after = projectSaveGoalTargetDate(state, city(), "2026-04-01");
    expect(city().savedAmount).toBe(40);
    expect(after.etaDays).toBe(6); // 60 left / 10
    expect(after.etaDays!).toBeLessThan(before.etaDays!);
    expect(findReserveGoal(state)!.savedAmount).toBe(0);
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
  it("does not auto-credit — empty unapplied days do not mint roll", () => {
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
    // Empty Apr 1–2 do not invent inbound into Apr 3
    const day3 = leftoverBeforeApply(state, "2026-04-03");
    expect(day3.carryIn).toBe(0);
    expect(day3.inbound).toBe(16);
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
    // Inbound override creates roll activity without a Reserve expense.
    state = setSaveGoalDayInbound(state, { date: "2026-04-01", amount: 11 });
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
    const id = state.saveGoals!.find((g) => g.name === "Trip")!.id;
    state = updateSaveGoal(state, {
      id,
      name: "Hawaii",
      targetAmount: 800,
    });
    const hawaii = state.saveGoals!.find((g) => g.name === "Hawaii")!;
    expect(hawaii.targetAmount).toBe(800);
  });
});

describe("addSaveGoalSpend + applySaveGoalDayTotals", () => {
  it("debits Reserve on expense and restores on undo", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "City",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    state = creditSaveGoalReserve(state, { date: "2026-10-01", amount: 50 });
    expect(findReserveGoal(state)!.savedAmount).toBe(50);

    state = addSaveGoalSpend(state, {
      date: "2026-10-01",
      amount: 12,
      kind: "spend",
      category: "meals",
    });
    expect(findReserveGoal(state)!.savedAmount).toBe(38);
    const entry = state.saveGoalSpendEntries!.find((e) => e.amount === 12)!;
    expect(entry.reserveAdjustId).toBeTruthy();

    state = removeSaveGoalSpend(state, entry.id);
    expect(findReserveGoal(state)!.savedAmount).toBe(50);
    expect(state.saveGoalSpendEntries ?? []).toHaveLength(0);
  });

  it("groups expenses by day newest-first", () => {
    let state = emptyState();
    state = createSaveGoal(state, {
      name: "City",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    state = creditSaveGoalReserve(state, { date: "2026-10-01", amount: 40 });
    state = addSaveGoalSpend(state, {
      date: "2026-10-01",
      amount: 5,
      kind: "spend",
      category: "meals",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-10-02",
      amount: 3,
      kind: "spend",
      category: "clothes",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-10-02",
      amount: 2,
      kind: "spend",
      category: "entertainment",
    });
    const days = groupSaveGoalExpensesByDay(state);
    expect(days.map((d) => d.date)).toEqual(["2026-10-02", "2026-10-01"]);
    expect(days[0].total).toBe(5);
    expect(days[0].entries).toHaveLength(2);
    expect(days[1].total).toBe(5);
    expect(days[1].entries).toHaveLength(1);
  });

  it("custom apply sends all leftover to one goal", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-04-01",
    });
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => findReserveGoal(state)!;
    state = setInboundPercents(state, {
      [general().id]: 100,
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
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => findReserveGoal(state)!;
    state = setInboundPercents(state, {
      [general().id]: 100,
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

  it("expenses debit Reserve and do not reduce day leftover", () => {
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
    const reserve = () => findReserveGoal(state)!;
    state = creditSaveGoalReserve(state, { date: "2026-04-01", amount: 20 });
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
    expect(reserve().savedAmount).toBe(12);
    const before = leftoverBeforeApply(state, "2026-04-01");
    expect(before.inbound).toBe(16);
    expect(before.spend).toBe(0);
    expect(before.adds).toBe(0);
    expect(before.left).toBe(16);
    expect(spendTotalForDate(state, "2026-04-01")).toBe(8);

    const entryId = state.saveGoalSpendEntries![0].id;
    state = removeSaveGoalSpend(state, entryId);
    expect(spendTotalForDate(state, "2026-04-01")).toBe(3);
    expect(reserve().savedAmount).toBe(17);

    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    expect(trip().savedAmount).toBe(8);
    expect(gift().savedAmount).toBe(8);
    const close = state.saveGoalDays!.find(
      (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
    )!;
    expect(close.spendTotal).toBe(0);
    expect(close.leftover).toBe(16);
  });

  it("keeps cents on expense amounts; leftover ignores Reserve spends", () => {
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
    expect(before.spend).toBe(0);
    expect(before.left).toBe(16);
    expect(state.saveGoalSpendEntries![0].amount).toBe(8.18);
    expect(findReserveGoal(state)!.savedAmount).toBe(-8.18);
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

    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 4.5,
      kind: "spend",
      category: "coffee",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 12,
      kind: "spend",
      category: "subs",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 22,
      kind: "spend",
      category: "transport",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 40,
      kind: "spend",
      category: "gifts",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 15,
      kind: "spend",
      category: "health",
    });
    expect(spendCategoryLabelsForDate(state, "2026-04-01")).toEqual([
      "Entertainment",
      "Meals",
      "Coffee",
      "Subs",
      "Transport",
      "Gifts",
      "Health",
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

  it("manual adds increase day total; expenses still debit Reserve only", () => {
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
    expect(before.spend).toBe(0);
    expect(before.left).toBe(36);
    expect(findReserveGoal(state)!.savedAmount).toBe(-5);

    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    const close = state.saveGoalDays!.find(
      (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
    )!;
    expect(close.dailyIncome).toBe(36);
    expect(close.spendTotal).toBe(0);
    expect(close.leftover).toBe(36);
    expect(
      state.saveGoals!.find((g) => g.name === "Trip")!.savedAmount,
    ).toBe(36);
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
    const trip = () => state.saveGoals!.find((g) => g.name === "Trip")!;
    expect(trip().savedAmount).toBe(16);
    expect(
      state.saveGoalDays!.some(
        (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
      ),
    ).toBe(true);

    state = undoApplySaveGoalDayTotals(state, "2026-04-01");
    expect(trip().savedAmount).toBe(0);
    expect(
      state.saveGoalDays!.some(
        (d) => d.date === "2026-04-01" && (d.kind ?? "close") === "close",
      ),
    ).toBe(false);
    expect(leftoverBeforeApply(state, "2026-04-01").left).toBe(16);
  });

  it("clearDaySpend removes spend, restores Reserve, and undoes apply", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    state = creditSaveGoalReserve(state, { date: "2026-04-01", amount: 100 });
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 96,
      kind: "spend",
      category: "meals",
    });
    state = applySaveGoalDayTotals(state, { date: "2026-04-01" });
    const trip = () => state.saveGoals!.find((g) => g.name === "Trip")!;
    const reserve = () => findReserveGoal(state)!;
    // Expense hit Reserve; apply still credits full leftover
    expect(reserve().savedAmount).toBe(4);
    expect(trip().savedAmount).toBe(16);
    expect(spendTotalForDate(state, "2026-04-01")).toBe(96);

    state = clearSaveGoalDaySpend(state, "2026-04-01");
    expect(spendTotalForDate(state, "2026-04-01")).toBe(0);
    expect(saveGoalCloseForDate(state, "2026-04-01")).toBeNull();
    expect(trip().savedAmount).toBe(0);
    expect(reserve().savedAmount).toBe(100);
  });

  it("applies only rolled history and leaves today open", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "Trip",
      targetAmount: 500,
      createdOn: "2026-04-01",
    });
    // Adds create roll activity (Reserve expenses do not).
    state = addSaveGoalSpend(state, {
      date: "2026-04-01",
      amount: 1,
      kind: "add",
    });
    state = addSaveGoalSpend(state, {
      date: "2026-04-02",
      amount: 1,
      kind: "add",
    });
    // Apr1: inbound16+1=17 rolls; Apr2: 16+17+1=34 rolls; Apr3 carryIn 34
    expect(leftoverBeforeApply(state, "2026-04-03").carryIn).toBe(34);
    expect(listRolledOpenDatesBefore(state, "2026-04-03")).toEqual([
      "2026-04-01",
      "2026-04-02",
    ]);

    state = applySaveGoalRolledOnly(state, { date: "2026-04-03" });
    // Each day closes in order; after Apr 1 closes, Apr 2 has no carry.
    expect(
      state.saveGoals!.find((g) => g.name === "Trip")!.savedAmount,
    ).toBe(17 + 17);
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
    expect(
      state.saveGoals!.find((g) => g.name === "General")!.savedAmount,
    ).toBeGreaterThan(0);

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

  it("wiped ledger shows only today’s rate — empty prior days do not roll", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    // Accrual since Oct 1 but no activity → today is just the daily rate
    const today = leftoverBeforeApply(state, "2026-10-06");
    expect(today.carryIn).toBe(0);
    expect(today.base).toBe(dailyIncomeRate("2026-10-06", 500));
    expect(today.inbound).toBe(today.base);
    expect(listRolledOpenDatesBefore(state, "2026-10-06")).toEqual([]);
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
    const general = state.saveGoals!.find((g) => g.name === "General")!;
    expect(general.createdOn).toBe(SAVE_GOAL_LEDGER_START);
    const close = saveGoalCloseForDate(state, "2026-10-01")!;
    const generalApplied = close.allocations
      .filter((a) => a.goalId === general.id)
      .reduce((s, a) => s + a.amount, 0);
    expect(general.savedAmount).toBe(generalApplied);
  });

  it("summarizes applied-by-goal and spend-by-category for a month", () => {
    let state = emptyState();
    state = updateSaveGoalSettings(state, { monthlyIncome: 500 });
    state = createSaveGoal(state, {
      name: "General",
      targetAmount: 2900,
      createdOn: "2026-10-01",
    });
    // Auto-created Reserve (do not create a second Reserve)
    const general = () => state.saveGoals!.find((g) => g.name === "General")!;
    const reserve = () => findReserveGoal(state)!;
    expect(reserve()).toBeTruthy();
    state = setInboundPercents(state, {
      [general().id]: 100,
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
    // Reserve is the hub — no % share of daily apply
    expect(summary.appliedByGoalId[reserve().id] ?? 0).toBe(0);
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
