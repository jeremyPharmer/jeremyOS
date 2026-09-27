import { addDays, newId, parseDate } from "./journey";
import type {
  RebuildState,
  SaveGoal,
  SaveGoalAllocation,
  SaveGoalDay,
  SaveGoalSettings,
} from "./types";

export const DEFAULT_MONTHLY_INCOME = 500;
export const DEFAULT_INCOME_DAY = 1;
export const HOME_SAVE_GOAL_CARD_LIMIT = 3;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function defaultSaveGoalSettings(): SaveGoalSettings {
  return {
    monthlyIncome: DEFAULT_MONTHLY_INCOME,
    incomeDayOfMonth: DEFAULT_INCOME_DAY,
  };
}

export function normalizeSaveGoalSettings(
  raw?: SaveGoalSettings | null,
): SaveGoalSettings {
  const base = defaultSaveGoalSettings();
  if (!raw) return base;
  const monthly = Number(raw.monthlyIncome);
  const day = Number(raw.incomeDayOfMonth);
  return {
    monthlyIncome:
      Number.isFinite(monthly) && monthly >= 0 ? round2(monthly) : base.monthlyIncome,
    incomeDayOfMonth:
      Number.isFinite(day) && day >= 1 && day <= 28
        ? Math.floor(day)
        : base.incomeDayOfMonth,
  };
}

/** Calendar days in the month containing `date` (YYYY-MM-DD). */
export function daysInMonthForDate(date: string): number {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Equal share of monthly income for each calendar day in that month.
 * $500 / 31 → $16.13; $500 / 30 → $16.67.
 */
export function dailyIncomeRate(
  date: string,
  monthlyIncome = DEFAULT_MONTHLY_INCOME,
): number {
  const days = daysInMonthForDate(date);
  if (days <= 0) return 0;
  return round2(monthlyIncome / days);
}

export function leftoverPool(
  dailyIncome: number,
  spendTotal: number,
  lumpSum = 0,
): { leftover: number; pool: number } {
  const leftover = round2(dailyIncome - spendTotal);
  const pool = round2(leftover + lumpSum);
  return { leftover, pool };
}

export function activeSaveGoals(state: RebuildState): SaveGoal[] {
  return (state.saveGoals ?? []).filter((g) => g.status === "active");
}

export function amountToGo(goal: Pick<SaveGoal, "targetAmount" | "savedAmount">): number {
  return round2(Math.max(0, goal.targetAmount - goal.savedAmount));
}

export function progressRatio(goal: Pick<SaveGoal, "targetAmount" | "savedAmount">): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(1, Math.max(0, goal.savedAmount / goal.targetAmount));
}

/** Split `pool` across goals by weight; last goal absorbs rounding residue. */
export function splitPoolByWeight(
  pool: number,
  goals: Array<Pick<SaveGoal, "id" | "allocationWeight">>,
): SaveGoalAllocation[] {
  if (!goals.length || pool === 0) return [];
  const weights = goals.map((g) =>
    Number.isFinite(g.allocationWeight) && g.allocationWeight > 0
      ? g.allocationWeight
      : 1,
  );
  const totalW = weights.reduce((a, b) => a + b, 0);
  if (totalW <= 0) return [];

  const allocations: SaveGoalAllocation[] = [];
  let assigned = 0;
  for (let i = 0; i < goals.length; i++) {
    const isLast = i === goals.length - 1;
    const amount = isLast
      ? round2(pool - assigned)
      : round2((pool * weights[i]) / totalW);
    assigned = round2(assigned + amount);
    allocations.push({ goalId: goals[i].id, amount });
  }
  return allocations;
}

export function savedAmountFromDays(
  goalId: string,
  days: SaveGoalDay[],
): number {
  let sum = 0;
  for (const day of days) {
    for (const a of day.allocations ?? []) {
      if (a.goalId === goalId) sum += a.amount;
    }
  }
  return round2(sum);
}

export function recomputeSavedAmounts(
  goals: SaveGoal[],
  days: SaveGoalDay[],
): SaveGoal[] {
  return goals.map((g) => {
    const savedAmount = savedAmountFromDays(g.id, days);
    let status = g.status;
    if (status === "archived") {
      /* keep */
    } else if (savedAmount >= g.targetAmount) {
      status = "reached";
    } else if (status === "reached" && savedAmount < g.targetAmount) {
      status = "active";
    }
    return { ...g, savedAmount, status };
  });
}

export function normalizeSaveGoals(state: RebuildState): RebuildState {
  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const days = (state.saveGoalDays ?? [])
    .filter((d) => d && DATE_RE.test(d.date))
    .map((d) => ({
      date: d.date,
      dailyIncome: round2(Number(d.dailyIncome) || 0),
      spendTotal: round2(Math.max(0, Number(d.spendTotal) || 0)),
      leftover: round2(Number(d.leftover) || 0),
      lumpSum: round2(Math.max(0, Number(d.lumpSum) || 0)),
      allocations: (d.allocations ?? []).map((a) => ({
        goalId: String(a.goalId),
        amount: round2(Number(a.amount) || 0),
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const goals = recomputeSavedAmounts(
    (state.saveGoals ?? []).map((g) => ({
      id: String(g.id),
      name: String(g.name ?? "").trim() || "Save goal",
      targetAmount: round2(Math.max(0.01, Number(g.targetAmount) || 0.01)),
      savedAmount: round2(Number(g.savedAmount) || 0),
      createdOn: DATE_RE.test(g.createdOn) ? g.createdOn : days[0]?.date ?? "1970-01-01",
      status:
        g.status === "archived" || g.status === "reached" || g.status === "active"
          ? g.status
          : "active",
      allocationWeight:
        Number.isFinite(g.allocationWeight) && g.allocationWeight > 0
          ? g.allocationWeight
          : 1,
    })),
    days,
  );

  return {
    ...state,
    saveGoalSettings: settings,
    saveGoals: goals,
    saveGoalDays: days,
  };
}

export function createSaveGoal(
  state: RebuildState,
  input: { name: string; targetAmount: number; createdOn: string },
): RebuildState {
  const name = input.name.trim().slice(0, 80);
  const targetAmount = round2(Number(input.targetAmount));
  if (!name) throw Object.assign(new Error("Name required"), { status: 400 });
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw Object.assign(new Error("Target must be greater than 0"), {
      status: 400,
    });
  }
  if (!DATE_RE.test(input.createdOn)) {
    throw Object.assign(new Error("createdOn required"), { status: 400 });
  }

  const goal: SaveGoal = {
    id: newId("sg"),
    name,
    targetAmount,
    savedAmount: 0,
    createdOn: input.createdOn,
    status: "active",
    allocationWeight: 1,
  };

  const next = normalizeSaveGoals({
    ...state,
    saveGoals: [...(state.saveGoals ?? []), goal],
  });
  return next;
}

export function updateSaveGoal(
  state: RebuildState,
  input: {
    id: string;
    name?: string;
    targetAmount?: number;
    status?: SaveGoal["status"];
  },
): RebuildState {
  const id = String(input.id ?? "").trim();
  if (!id) throw Object.assign(new Error("id required"), { status: 400 });
  const goals = state.saveGoals ?? [];
  if (!goals.some((g) => g.id === id)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }

  const nextGoals = goals.map((g) => {
    if (g.id !== id) return g;
    const name =
      input.name !== undefined ? String(input.name).trim().slice(0, 80) : g.name;
    if (!name) {
      throw Object.assign(new Error("Name required"), { status: 400 });
    }
    let targetAmount = g.targetAmount;
    if (input.targetAmount !== undefined) {
      targetAmount = round2(Number(input.targetAmount));
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        throw Object.assign(new Error("Target must be greater than 0"), {
          status: 400,
        });
      }
    }
    const status = input.status ?? g.status;
    return { ...g, name, targetAmount, status };
  });

  return normalizeSaveGoals({ ...state, saveGoals: nextGoals });
}

export function updateSaveGoalSettings(
  state: RebuildState,
  input: { monthlyIncome?: number; incomeDayOfMonth?: number },
): RebuildState {
  const prev = normalizeSaveGoalSettings(state.saveGoalSettings);
  const monthlyIncome =
    input.monthlyIncome !== undefined
      ? round2(Number(input.monthlyIncome))
      : prev.monthlyIncome;
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    throw Object.assign(new Error("monthlyIncome must be ≥ 0"), { status: 400 });
  }
  const incomeDayOfMonth =
    input.incomeDayOfMonth !== undefined
      ? Math.floor(Number(input.incomeDayOfMonth))
      : prev.incomeDayOfMonth;
  if (
    !Number.isFinite(incomeDayOfMonth) ||
    incomeDayOfMonth < 1 ||
    incomeDayOfMonth > 28
  ) {
    throw Object.assign(new Error("incomeDayOfMonth must be 1–28"), {
      status: 400,
    });
  }
  return normalizeSaveGoals({
    ...state,
    saveGoalSettings: { monthlyIncome, incomeDayOfMonth },
  });
}

export type RecordSaveGoalDayInput = {
  date: string;
  spendTotal: number;
  lumpSum?: number;
  /** Optional manual override; must sum to pool within $0.01 */
  allocations?: SaveGoalAllocation[];
};

/**
 * Persist one evening money row. Replaces any existing row for `date`
 * and recomputes savedAmount from the full ledger.
 */
export function recordSaveGoalDay(
  state: RebuildState,
  input: RecordSaveGoalDayInput,
): RebuildState {
  if (!DATE_RE.test(input.date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const spendTotal = round2(Number(input.spendTotal));
  if (!Number.isFinite(spendTotal) || spendTotal < 0) {
    throw Object.assign(new Error("spendTotal must be ≥ 0"), { status: 400 });
  }
  const lumpSum = round2(Math.max(0, Number(input.lumpSum) || 0));
  if (!Number.isFinite(lumpSum)) {
    throw Object.assign(new Error("lumpSum invalid"), { status: 400 });
  }

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const dailyIncome = dailyIncomeRate(input.date, settings.monthlyIncome);
  const { leftover, pool } = leftoverPool(dailyIncome, spendTotal, lumpSum);

  const goals = activeSaveGoals(state);
  let allocations: SaveGoalAllocation[] = [];

  if (goals.length > 0 && pool !== 0) {
    if (input.allocations && input.allocations.length > 0) {
      allocations = input.allocations.map((a) => ({
        goalId: String(a.goalId),
        amount: round2(Number(a.amount) || 0),
      }));
      const activeIds = new Set(goals.map((g) => g.id));
      for (const a of allocations) {
        if (!activeIds.has(a.goalId)) {
          throw Object.assign(new Error("Unknown goal in allocations"), {
            status: 400,
          });
        }
      }
      const sum = round2(allocations.reduce((s, a) => s + a.amount, 0));
      if (Math.abs(sum - pool) > 0.01) {
        throw Object.assign(
          new Error(`Allocations must sum to ${pool.toFixed(2)}`),
          { status: 400 },
        );
      }
    } else {
      allocations = splitPoolByWeight(pool, goals);
    }
  }

  const day: SaveGoalDay = {
    date: input.date,
    dailyIncome,
    spendTotal,
    leftover,
    lumpSum,
    allocations,
  };

  const days = [
    ...(state.saveGoalDays ?? []).filter((d) => d.date !== input.date),
    day,
  ];

  return normalizeSaveGoals({ ...state, saveGoalDays: days });
}

/** Mean spend over the last N save-goal days at or before `today` (most recent). */
export function averageSpendLastDays(
  days: SaveGoalDay[],
  today: string,
  n = 7,
): number | null {
  const prior = days
    .filter((d) => d.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
  if (!prior.length) return null;
  const sum = prior.reduce((s, d) => s + d.spendTotal, 0);
  return round2(sum / prior.length);
}

export type SaveGoalProjection = {
  goalId: string;
  remaining: number;
  projectedPoolPerDay: number;
  goalDaily: number;
  etaDays: number | null;
  targetDate: string | null;
  status: "reached" | "on_track" | "needs_leftover";
};

export function projectSaveGoalTargetDate(
  state: RebuildState,
  goal: SaveGoal,
  today: string,
): SaveGoalProjection {
  const remaining = round2(goal.targetAmount - goal.savedAmount);
  if (remaining <= 0 || goal.status === "reached") {
    return {
      goalId: goal.id,
      remaining: Math.max(0, remaining),
      projectedPoolPerDay: 0,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "reached",
    };
  }

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const dailyIncome = dailyIncomeRate(today, settings.monthlyIncome);
  const avgSpend = averageSpendLastDays(state.saveGoalDays ?? [], today, 7);
  const spendAssumption = avgSpend ?? 0;
  const projectedPoolPerDay = round2(dailyIncome - spendAssumption);

  if (projectedPoolPerDay <= 0) {
    return {
      goalId: goal.id,
      remaining,
      projectedPoolPerDay,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "needs_leftover",
    };
  }

  const actives = activeSaveGoals(state);
  const weights = actives.map((g) =>
    g.allocationWeight > 0 ? g.allocationWeight : 1,
  );
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const w =
    (goal.allocationWeight > 0 ? goal.allocationWeight : 1) / totalW;
  const goalDaily = round2(projectedPoolPerDay * w);
  if (goalDaily <= 0) {
    return {
      goalId: goal.id,
      remaining,
      projectedPoolPerDay,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "needs_leftover",
    };
  }

  const etaDays = Math.ceil(remaining / goalDaily);
  return {
    goalId: goal.id,
    remaining,
    projectedPoolPerDay,
    goalDaily,
    etaDays,
    targetDate: addDays(today, etaDays),
    status: "on_track",
  };
}

export function formatTargetDateLabel(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}
