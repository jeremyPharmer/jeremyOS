import { addDays, datesInRange, newId, parseDate } from "./journey";
import type {
  RebuildState,
  SaveGoal,
  SaveGoalAllocation,
  SaveGoalDay,
  SaveGoalSettings,
  SaveGoalSpendEntry,
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

/** Preset % of daily inbound for a goal (0–100). */
export function inboundPercent(
  goal: Pick<SaveGoal, "allocationWeight">,
): number {
  const w = Number(goal.allocationWeight);
  if (!Number.isFinite(w) || w < 0) return 0;
  return round2(w);
}

export function amountToGo(goal: Pick<SaveGoal, "targetAmount" | "savedAmount">): number {
  return round2(Math.max(0, goal.targetAmount - goal.savedAmount));
}

export function progressRatio(goal: Pick<SaveGoal, "targetAmount" | "savedAmount">): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(1, Math.max(0, goal.savedAmount / goal.targetAmount));
}

/**
 * Normalize active inbound %.
 * - Sum may be ≤ 100 (unallocated remainder is fine).
 * - Sum > 100 is scaled down to 100.
 * - Legacy equal relative weights (all `1`) become equal percents.
 */
export function normalizeInboundPercents(goals: SaveGoal[]): SaveGoal[] {
  const actives = goals.filter((g) => g.status === "active");
  if (!actives.length) return goals;

  const clamped = goals.map((g) =>
    g.status === "active"
      ? {
          ...g,
          allocationWeight: round2(
            Math.min(100, Math.max(0, Number(g.allocationWeight) || 0)),
          ),
        }
      : g,
  );
  const activeClamped = clamped.filter((g) => g.status === "active");
  const rawSum = round2(
    activeClamped.reduce((s, g) => s + g.allocationWeight, 0),
  );

  if (rawSum <= 0) {
    const firstId = activeClamped[0].id;
    return clamped.map((g) =>
      g.status !== "active"
        ? g
        : { ...g, allocationWeight: g.id === firstId ? 100 : 0 },
    );
  }

  // Legacy: all weights identical and tiny (e.g. every goal `1`) → equal %
  const firstW = activeClamped[0].allocationWeight;
  const allEqualLegacy =
    activeClamped.every((g) => g.allocationWeight === firstW) &&
    firstW > 0 &&
    firstW <= 10 &&
    rawSum < 99.95;
  if (allEqualLegacy) {
    let assigned = 0;
    const percents = new Map<string, number>();
    activeClamped.forEach((g, i) => {
      const isLast = i === activeClamped.length - 1;
      const p = isLast
        ? round2(100 - assigned)
        : round2(100 / activeClamped.length);
      assigned = round2(assigned + p);
      percents.set(g.id, p);
    });
    return clamped.map((g) =>
      percents.has(g.id)
        ? { ...g, allocationWeight: percents.get(g.id)! }
        : g,
    );
  }

  if (rawSum <= 100.05) {
    return clamped;
  }

  // Over 100 → scale down
  let assigned = 0;
  const percents = new Map<string, number>();
  activeClamped.forEach((g, i) => {
    const isLast = i === activeClamped.length - 1;
    const p = isLast
      ? round2(100 - assigned)
      : round2((g.allocationWeight / rawSum) * 100);
    assigned = round2(assigned + p);
    percents.set(g.id, Math.max(0, p));
  });

  return clamped.map((g) =>
    percents.has(g.id)
      ? { ...g, allocationWeight: percents.get(g.id)! }
      : g,
  );
}

/**
 * Set one goal’s inbound %. If the new total would exceed 100, equally
 * reduce the other active goals (floored at 0) until the sum is 100.
 */
export function setGoalInboundPercent(
  state: RebuildState,
  goalId: string,
  percent: number,
): RebuildState {
  const id = String(goalId ?? "").trim();
  const actives = activeSaveGoals(state);
  if (!actives.some((g) => g.id === id)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const nextPct = round2(Number(percent));
  if (!Number.isFinite(nextPct) || nextPct < 0 || nextPct > 100) {
    throw Object.assign(new Error("Inbound % must be 0–100"), { status: 400 });
  }

  const map = new Map<string, number>();
  for (const g of actives) {
    map.set(g.id, inboundPercent(g));
  }
  map.set(id, nextPct);

  let sum = round2([...map.values()].reduce((a, b) => a + b, 0));
  if (sum > 100) {
    let excess = round2(sum - 100);
    const others = actives.filter((g) => g.id !== id);
    // Equally shave others; if some hit 0, redistributing remaining excess.
    while (excess > 0.05 && others.some((g) => (map.get(g.id) ?? 0) > 0)) {
      const reducible = others.filter((g) => (map.get(g.id) ?? 0) > 0);
      if (!reducible.length) break;
      const share = round2(excess / reducible.length);
      let taken = 0;
      for (let i = 0; i < reducible.length; i++) {
        const gid = reducible[i].id;
        const cur = map.get(gid) ?? 0;
        const isLast = i === reducible.length - 1;
        const want = isLast ? round2(excess - taken) : share;
        const cut = round2(Math.min(cur, Math.max(0, want)));
        map.set(gid, round2(cur - cut));
        taken = round2(taken + cut);
      }
      excess = round2(excess - taken);
      if (taken <= 0) break;
    }
    // If others couldn't absorb (all zero), clamp this goal to remaining room.
    sum = round2([...map.values()].reduce((a, b) => a + b, 0));
    if (sum > 100) {
      const othersSum = round2(
        others.reduce((s, g) => s + (map.get(g.id) ?? 0), 0),
      );
      map.set(id, round2(Math.max(0, 100 - othersSum)));
    }
  }

  return normalizeSaveGoals({
    ...state,
    saveGoals: (state.saveGoals ?? []).map((g) =>
      map.has(g.id) ? { ...g, allocationWeight: map.get(g.id)! } : g,
    ),
  });
}

/** Merge allocation rows by goalId. */
export function mergeAllocations(
  rows: SaveGoalAllocation[],
): SaveGoalAllocation[] {
  const map = new Map<string, number>();
  for (const a of rows) {
    map.set(a.goalId, round2((map.get(a.goalId) ?? 0) + a.amount));
  }
  return [...map.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([goalId, amount]) => ({ goalId, amount }));
}

/**
 * Split `pool` by inbound % (or relative weights). Goals at 0% get nothing.
 * Last positive-share goal absorbs rounding residue.
 */
export function splitPoolByWeight(
  pool: number,
  goals: Array<Pick<SaveGoal, "id" | "allocationWeight">>,
): SaveGoalAllocation[] {
  if (!goals.length || pool === 0) return [];
  const recipients = goals.filter(
    (g) => Number.isFinite(g.allocationWeight) && g.allocationWeight > 0,
  );
  if (!recipients.length) return [];

  const weights = recipients.map((g) => g.allocationWeight);
  const totalW = weights.reduce((a, b) => a + b, 0);
  if (totalW <= 0) return [];

  const allocations: SaveGoalAllocation[] = [];
  let assigned = 0;
  for (let i = 0; i < recipients.length; i++) {
    const isLast = i === recipients.length - 1;
    const amount = isLast
      ? round2(pool - assigned)
      : round2((pool * weights[i]) / totalW);
    assigned = round2(assigned + amount);
    allocations.push({ goalId: recipients[i].id, amount });
  }
  return allocations;
}

/** Put 100% of an amount on one goal. */
export function splitPoolToOne(
  pool: number,
  goalId: string,
): SaveGoalAllocation[] {
  if (pool === 0) return [];
  return [{ goalId, amount: round2(pool) }];
}

/** Equal split across selected goal ids (custom one-time). */
export function splitPoolAcrossIds(
  pool: number,
  goalIds: string[],
): SaveGoalAllocation[] {
  if (!goalIds.length || pool === 0) return [];
  const unique = [...new Set(goalIds)];
  return splitPoolByWeight(
    pool,
    unique.map((id) => ({ id, allocationWeight: 1 })),
  );
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
      kind: d.kind === "adjust" ? ("adjust" as const) : ("close" as const),
      id: d.id ? String(d.id) : d.kind === "adjust" ? newId("sga") : undefined,
      source:
        d.source === "auto" || d.source === "manual" ? d.source : undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let goals = recomputeSavedAmounts(
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
      allocationWeight: Number.isFinite(g.allocationWeight)
        ? Number(g.allocationWeight)
        : 0,
    })),
    days,
  );
  goals = normalizeInboundPercents(goals);

  const spendEntries = (state.saveGoalSpendEntries ?? [])
    .filter((e) => e && DATE_RE.test(e.date) && e.id)
    .map((e) => ({
      id: String(e.id),
      date: e.date,
      amount: round2(Math.max(0, Number(e.amount) || 0)),
      note: e.note ? String(e.note).trim().slice(0, 80) : undefined,
      at: e.at ? String(e.at) : undefined,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return String(a.at ?? a.id).localeCompare(String(b.at ?? b.id));
    });

  return {
    ...state,
    saveGoalSettings: settings,
    saveGoals: goals,
    saveGoalDays: days,
    saveGoalSpendEntries: spendEntries,
  };
}

/** Spend entries for a calendar day (oldest first). */
export function listSaveGoalSpendEntries(
  state: RebuildState,
  date: string,
): SaveGoalSpendEntry[] {
  if (!DATE_RE.test(date)) return [];
  return (state.saveGoalSpendEntries ?? []).filter((e) => e.date === date);
}

export function spendTotalForDate(state: RebuildState, date: string): number {
  return round2(
    listSaveGoalSpendEntries(state, date).reduce((s, e) => s + e.amount, 0),
  );
}

function hasSaveGoalClose(state: RebuildState, date: string): boolean {
  return (state.saveGoalDays ?? []).some(
    (d) => d.date === date && (d.kind ?? "close") === "close",
  );
}

/**
 * Day pool before Apply: base daily rate + leftover rolled from prior
 * unapplied days − today’s spend entries.
 * Unapplied days do **not** credit goals; their left carries forward.
 */
export function leftoverBeforeApply(
  state: RebuildState,
  date: string,
): {
  base: number;
  carryIn: number;
  inbound: number;
  spend: number;
  left: number;
} {
  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  if (!DATE_RE.test(date)) {
    return { base: 0, carryIn: 0, inbound: 0, spend: 0, left: 0 };
  }
  const start = saveGoalAccrualStart(state, date);
  if (date < start) {
    const base = dailyIncomeRate(date, settings.monthlyIncome);
    const spend = spendTotalForDate(state, date);
    return {
      base,
      carryIn: 0,
      inbound: base,
      spend,
      left: round2(base - spend),
    };
  }

  let carry = 0;
  let result = {
    base: 0,
    carryIn: 0,
    inbound: 0,
    spend: 0,
    left: 0,
  };
  for (const d of datesInRange(start, date)) {
    const base = dailyIncomeRate(d, settings.monthlyIncome);
    const inbound = round2(base + carry);
    const spend = spendTotalForDate(state, d);
    const left = round2(inbound - spend);
    if (d === date) {
      result = { base, carryIn: carry, inbound, spend, left };
      break;
    }
    // Applied → spent into goals; nothing rolls. Otherwise left carries on.
    carry = hasSaveGoalClose(state, d) ? 0 : left;
  }
  return result;
}

export function addSaveGoalSpend(
  state: RebuildState,
  input: { date: string; amount: number; note?: string },
): RebuildState {
  if (!DATE_RE.test(input.date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("amount must be greater than 0"), {
      status: 400,
    });
  }
  const entry: SaveGoalSpendEntry = {
    id: newId("sgs"),
    date: input.date,
    amount,
    note: input.note?.trim().slice(0, 80) || undefined,
    at: new Date().toISOString(),
  };
  return normalizeSaveGoals({
    ...state,
    saveGoalSpendEntries: [...(state.saveGoalSpendEntries ?? []), entry],
  });
}

export function removeSaveGoalSpend(
  state: RebuildState,
  entryId: string,
): RebuildState {
  const id = String(entryId ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("spend id required"), { status: 400 });
  }
  const entries = state.saveGoalSpendEntries ?? [];
  if (!entries.some((e) => e.id === id)) {
    throw Object.assign(new Error("Spend entry not found"), { status: 404 });
  }
  return normalizeSaveGoals({
    ...state,
    saveGoalSpendEntries: entries.filter((e) => e.id !== id),
  });
}

/**
 * Apply today’s running ledger: leftover (day total − spends) is allocated by
 * preset inbound % to active goals. Stops roll-forward for this date.
 * Idempotent replace of that date’s close.
 */
export function applySaveGoalDayTotals(
  state: RebuildState,
  input: { date: string; lumpSum?: number } = { date: "" },
): RebuildState {
  const date = String(input.date ?? "").trim();
  if (!DATE_RE.test(date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const { spend } = leftoverBeforeApply(state, date);
  return recordSaveGoalDay(state, {
    date,
    spendTotal: spend,
    lumpSum: input.lumpSum !== undefined ? Number(input.lumpSum) : 0,
    lumpMode: "preset",
    source: "manual",
  });
}

export function createSaveGoal(
  state: RebuildState,
  input: {
    name: string;
    targetAmount: number;
    createdOn: string;
    /** When true (default if first/only), this goal gets 100% of daily inbound */
    claimDailyInbound?: boolean;
  },
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

  const existingActives = activeSaveGoals(state);
  const claim =
    input.claimDailyInbound !== undefined
      ? Boolean(input.claimDailyInbound)
      : existingActives.length === 0;

  const goal: SaveGoal = {
    id: newId("sg"),
    name,
    targetAmount,
    savedAmount: 0,
    createdOn: input.createdOn,
    status: "active",
    allocationWeight: claim ? 100 : 0,
  };

  let others = state.saveGoals ?? [];
  if (claim && existingActives.length > 0) {
    others = others.map((g) =>
      g.status === "active" ? { ...g, allocationWeight: 0 } : g,
    );
  }

  return normalizeSaveGoals({
    ...state,
    saveGoals: [...others, goal],
  });
}

/** Set every active goal’s daily inbound % (must sum to 100). */
export function setInboundPercents(
  state: RebuildState,
  percents: Record<string, number>,
): RebuildState {
  const actives = activeSaveGoals(state);
  if (!actives.length) {
    throw Object.assign(new Error("No active save goals"), { status: 400 });
  }

  let sum = 0;
  const nextMap = new Map<string, number>();
  for (const g of actives) {
    const raw =
      percents[g.id] !== undefined ? Number(percents[g.id]) : inboundPercent(g);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      throw Object.assign(new Error("Each inbound % must be 0–100"), {
        status: 400,
      });
    }
    const p = round2(raw);
    nextMap.set(g.id, p);
    sum = round2(sum + p);
  }
  if (Math.abs(sum - 100) > 0.05) {
    throw Object.assign(new Error("Inbound shares must add up to 100%"), {
      status: 400,
    });
  }

  return normalizeSaveGoals({
    ...state,
    saveGoals: (state.saveGoals ?? []).map((g) =>
      nextMap.has(g.id)
        ? { ...g, allocationWeight: nextMap.get(g.id)! }
        : g,
    ),
  });
}

/** Chip shortcut: send 100% of daily inbound to one goal. */
export function setSoleDailyTarget(
  state: RebuildState,
  goalId: string,
): RebuildState {
  const id = String(goalId ?? "").trim();
  if (!activeSaveGoals(state).some((g) => g.id === id)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const percents: Record<string, number> = {};
  for (const g of activeSaveGoals(state)) {
    percents[g.id] = g.id === id ? 100 : 0;
  }
  return setInboundPercents(state, percents);
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

export type LumpAllocateMode = "preset" | "custom";

export type RecordSaveGoalDayInput = {
  date: string;
  spendTotal: number;
  lumpSum?: number;
  /**
   * How to place the lump (one-time). Daily leftover always uses preset %.
   * - preset (default): same chips / inbound % as daily
   * - custom: `lumpGoalId` (all to one) or `lumpAllocations` / `lumpGoalIds`
   */
  lumpMode?: LumpAllocateMode;
  lumpGoalId?: string;
  lumpGoalIds?: string[];
  lumpAllocations?: SaveGoalAllocation[];
  /** @deprecated full-pool override — prefer lump* fields */
  allocations?: SaveGoalAllocation[];
  /** manual approve/evening vs auto catch-up for missed days */
  source?: "manual" | "auto";
};

function resolveCustomPoolSplit(
  pool: number,
  goals: SaveGoal[],
  input: {
    goalId?: string;
    goalIds?: string[];
    allocations?: SaveGoalAllocation[];
  },
): SaveGoalAllocation[] {
  if (pool === 0 || !goals.length) return [];
  const activeIds = new Set(goals.map((g) => g.id));

  if (input.allocations && input.allocations.length > 0) {
    const allocations = input.allocations.map((a) => ({
      goalId: String(a.goalId),
      amount: round2(Number(a.amount) || 0),
    }));
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
    return allocations;
  }

  if (input.goalId) {
    if (!activeIds.has(input.goalId)) {
      throw Object.assign(new Error("Unknown goal"), { status: 400 });
    }
    return splitPoolToOne(pool, input.goalId);
  }

  if (input.goalIds && input.goalIds.length > 0) {
    for (const id of input.goalIds) {
      if (!activeIds.has(id)) {
        throw Object.assign(new Error("Unknown goal"), { status: 400 });
      }
    }
    return splitPoolAcrossIds(pool, input.goalIds);
  }

  // Custom with no picks → fall back to preset
  return splitPoolByWeight(pool, goals);
}

/**
 * Persist one evening money row. Replaces the close row for `date`.
 * Daily leftover uses preset inbound %; lump can follow preset or custom chips.
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

  // Day total includes rolled leftover from unapplied prior days
  const { inbound: dailyIncome } = leftoverBeforeApply(state, input.date);
  const leftover = round2(dailyIncome - spendTotal);
  const goals = activeSaveGoals(state);

  let allocations: SaveGoalAllocation[] = [];

  // Legacy full-pool override
  if (input.allocations && input.allocations.length > 0) {
    const pool = round2(leftover + lumpSum);
    allocations = resolveCustomPoolSplit(pool, goals, {
      allocations: input.allocations,
    });
  } else if (goals.length > 0) {
    const leftoverAlloc =
      leftover !== 0 ? splitPoolByWeight(leftover, goals) : [];
    let lumpAlloc: SaveGoalAllocation[] = [];
    if (lumpSum !== 0) {
      const lumpMode = input.lumpMode ?? "preset";
      if (lumpMode === "custom") {
        lumpAlloc = resolveCustomPoolSplit(lumpSum, goals, {
          goalId: input.lumpGoalId,
          goalIds: input.lumpGoalIds,
          allocations: input.lumpAllocations,
        });
      } else {
        lumpAlloc = splitPoolByWeight(lumpSum, goals);
      }
    }
    allocations = mergeAllocations([...leftoverAlloc, ...lumpAlloc]);
  }

  const day: SaveGoalDay = {
    date: input.date,
    dailyIncome,
    spendTotal,
    leftover,
    lumpSum,
    allocations,
    kind: "close",
    source: input.source ?? "manual",
  };

  const days = [
    ...(state.saveGoalDays ?? []).filter(
      (d) => !(d.date === input.date && (d.kind ?? "close") === "close"),
    ),
    day,
  ];

  return normalizeSaveGoals({ ...state, saveGoalDays: days });
}

/**
 * No-op: unapplied days keep their leftover in the rolling pool instead of
 * auto-crediting goals. Kept for callers / API compatibility.
 */
export function ensureSaveGoalDay(
  state: RebuildState,
  _date: string,
): RebuildState {
  return state;
}

/** Earliest date to start accrual / roll chain (first goal createdOn, else today). */
export function saveGoalAccrualStart(state: RebuildState, today: string): string {
  const created = (state.saveGoals ?? [])
    .map((g) => g.createdOn)
    .filter((d) => DATE_RE.test(d))
    .sort();
  if (created.length) return created[0];
  return today;
}

/**
 * Unapplied days roll leftover forward (see leftoverBeforeApply) — no
 * auto-apply into goals. Kept as a no-op for /api/state callers.
 */
export function ensureElapsedSaveGoalDays(
  state: RebuildState,
  _asOfDate: string,
): RebuildState {
  return state;
}

export type ApplySaveGoalAdjustmentInput = {
  date: string;
  /** Positive = add, negative = subtract */
  amount: number;
  /** preset = daily inbound chips; custom = one-time picks */
  mode?: LumpAllocateMode;
  goalId?: string;
  goalIds?: string[];
  allocations?: SaveGoalAllocation[];
};

/**
 * One-time bulk add/subtract. Preset mode uses the same inbound % chips as
 * daily leftover; custom can send all to one area (or a chosen set).
 */
export function applySaveGoalAdjustment(
  state: RebuildState,
  input: ApplySaveGoalAdjustmentInput,
): RebuildState {
  if (!DATE_RE.test(input.date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount === 0) {
    throw Object.assign(new Error("amount must be a non-zero number"), {
      status: 400,
    });
  }

  const goals = activeSaveGoals(state);
  if (!goals.length) {
    throw Object.assign(new Error("No active save goals"), { status: 400 });
  }

  const mode = input.mode ?? "preset";
  let allocations: SaveGoalAllocation[];
  if (mode === "custom") {
    allocations = resolveCustomPoolSplit(amount, goals, {
      goalId: input.goalId,
      goalIds: input.goalIds,
      allocations: input.allocations,
    });
  } else {
    allocations = splitPoolByWeight(amount, goals);
  }

  const day: SaveGoalDay = {
    id: newId("sga"),
    date: input.date,
    kind: "adjust",
    dailyIncome: 0,
    spendTotal: 0,
    leftover: 0,
    lumpSum: Math.max(0, amount),
    allocations,
  };

  return normalizeSaveGoals({
    ...state,
    saveGoalDays: [...(state.saveGoalDays ?? []), day],
  });
}

/** Remove a one-time adjustment by id (undo). Close/evening rows are untouched. */
export function removeSaveGoalAdjustment(
  state: RebuildState,
  adjustmentId: string,
): RebuildState {
  const id = String(adjustmentId ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("adjustment id required"), { status: 400 });
  }
  const days = state.saveGoalDays ?? [];
  const found = days.find(
    (d) => d.id === id && (d.kind ?? "close") === "adjust",
  );
  if (!found) {
    throw Object.assign(new Error("Adjustment not found"), { status: 404 });
  }
  return normalizeSaveGoals({
    ...state,
    saveGoalDays: days.filter((d) => d.id !== id),
  });
}

/** Recent one-time adjustments, newest first (for undo UI). */
export function listSaveGoalAdjustments(state: RebuildState): SaveGoalDay[] {
  return (state.saveGoalDays ?? [])
    .filter((d) => (d.kind ?? "close") === "adjust" && Boolean(d.id))
    .slice()
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return String(b.id).localeCompare(String(a.id));
    });
}

/** Evening/approve close rows, newest first. */
export function listSaveGoalCloseDays(state: RebuildState): SaveGoalDay[] {
  return (state.saveGoalDays ?? [])
    .filter((d) => (d.kind ?? "close") === "close")
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveGoalCloseForDate(
  state: RebuildState,
  date: string,
): SaveGoalDay | null {
  if (!DATE_RE.test(date)) return null;
  return (
    (state.saveGoalDays ?? []).find(
      (d) => d.date === date && (d.kind ?? "close") === "close",
    ) ?? null
  );
}

/** Adjustments that touched a specific goal (newest first). */
export function listSaveGoalAdjustmentsForGoal(
  state: RebuildState,
  goalId: string,
): Array<SaveGoalDay & { goalAmount: number }> {
  const id = String(goalId ?? "").trim();
  if (!id) return [];
  return listSaveGoalAdjustments(state)
    .map((d) => {
      const goalAmount = round2(
        (d.allocations ?? [])
          .filter((a) => a.goalId === id)
          .reduce((s, a) => s + a.amount, 0),
      );
      return { ...d, goalAmount };
    })
    .filter((d) => d.goalAmount !== 0);
}

export type DeleteSaveGoalInput = {
  id: string;
  date: string;
  /**
   * Move current balance to another active goal before archiving.
   * Omit / null / "" = archive in place (balance stays on archived goal).
   */
  reallocateToGoalId?: string | null;
};

/**
 * Delete (archive) a save goal. Optionally transfer its current saved
 * balance to another active goal via a one-time adjust, then archive.
 */
export function deleteSaveGoal(
  state: RebuildState,
  input: DeleteSaveGoalInput,
): RebuildState {
  const id = String(input.id ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("id required"), { status: 400 });
  }
  if (!DATE_RE.test(input.date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }

  const goal = (state.saveGoals ?? []).find((g) => g.id === id);
  if (!goal || goal.status === "archived") {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }

  let next = state;
  const reallocateTo = String(input.reallocateToGoalId ?? "").trim();
  if (reallocateTo) {
    if (reallocateTo === id) {
      throw Object.assign(new Error("Pick a different goal to reallocate to"), {
        status: 400,
      });
    }
    const target = activeSaveGoals(state).find((g) => g.id === reallocateTo);
    if (!target) {
      throw Object.assign(new Error("Reallocate target not found"), {
        status: 404,
      });
    }
    const amount = savedAmountFromDays(id, state.saveGoalDays ?? []);
    if (amount !== 0) {
      const transfer: SaveGoalDay = {
        id: newId("sga"),
        date: input.date,
        kind: "adjust",
        dailyIncome: 0,
        spendTotal: 0,
        leftover: 0,
        lumpSum: Math.max(0, amount),
        allocations: [
          { goalId: id, amount: round2(-amount) },
          { goalId: reallocateTo, amount: round2(amount) },
        ],
      };
      next = normalizeSaveGoals({
        ...next,
        saveGoalDays: [...(next.saveGoalDays ?? []), transfer],
      });
    }
  }

  return updateSaveGoal(next, { id, status: "archived" });
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

  const share = inboundPercent(goal) / 100;
  const goalDaily = round2(projectedPoolPerDay * share);
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
