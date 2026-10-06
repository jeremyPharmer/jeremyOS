import { addDays, datesInRange, newId, parseDate } from "./journey";
import type {
  RebuildState,
  SaveGoal,
  SaveGoalAllocation,
  SaveGoalDay,
  SaveGoalSettings,
  SaveGoalSpendCategory,
  SaveGoalSpendEntry,
} from "./types";

export const DEFAULT_MONTHLY_INCOME = 500;
export const DEFAULT_INCOME_DAY = 1;
export const HOME_SAVE_GOAL_CARD_LIMIT = 3;

export const SAVE_GOAL_SPEND_CATEGORIES: {
  id: SaveGoalSpendCategory;
  label: string;
}[] = [
  { id: "meals", label: "Meals" },
  { id: "snacks", label: "Snacks" },
  { id: "clothes", label: "Clothes" },
  { id: "entertainment", label: "Entertainment" },
  { id: "other", label: "Other" },
];

/** Older subtract categories → current ids (normalize / labels). */
const LEGACY_SPEND_CATEGORY: Record<string, SaveGoalSpendCategory> = {
  food: "meals",
  books_movies: "entertainment",
  maintenance: "other",
};

const SPEND_CATEGORY_IDS = new Set(
  SAVE_GOAL_SPEND_CATEGORIES.map((c) => c.id),
);

export function isSaveGoalSpendCategory(
  value: unknown,
): value is SaveGoalSpendCategory {
  return typeof value === "string" && SPEND_CATEGORY_IDS.has(value as SaveGoalSpendCategory);
}

/** Accept current or legacy category ids; returns canonical id. */
export function coerceSaveGoalSpendCategory(
  value: unknown,
): SaveGoalSpendCategory | undefined {
  if (typeof value !== "string") return undefined;
  if (isSaveGoalSpendCategory(value)) return value;
  return LEGACY_SPEND_CATEGORY[value];
}

export function saveGoalSpendCategoryLabel(
  category: SaveGoalSpendCategory | string | undefined,
): string {
  if (!category) return "Spend";
  const id = coerceSaveGoalSpendCategory(category) ?? category;
  return (
    SAVE_GOAL_SPEND_CATEGORIES.find((c) => c.id === id)?.label ?? "Spend"
  );
}

/** Category label for a spend line; Other includes free-text note when set. */
export function saveGoalSpendEntryLabel(
  entry: Pick<SaveGoalSpendEntry, "category" | "note" | "kind">,
): string {
  if (entryKind(entry) === "add") return "Add";
  const cat = coerceSaveGoalSpendCategory(entry.category);
  const base = saveGoalSpendCategoryLabel(cat);
  if (cat === "other") {
    const note = entry.note?.trim();
    if (note) return `Other · ${note}`;
  }
  return base;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Whole dollars only — always round down (drop cents). */
export function floorDollar(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

export function defaultSaveGoalSettings(): SaveGoalSettings {
  return {
    monthlyIncome: DEFAULT_MONTHLY_INCOME,
    incomeDayOfMonth: DEFAULT_INCOME_DAY,
    historyEpoch: 0,
  };
}

export function normalizeSaveGoalSettings(
  raw?: SaveGoalSettings | null,
): SaveGoalSettings {
  const base = defaultSaveGoalSettings();
  if (!raw) return base;
  const monthly = Number(raw.monthlyIncome);
  const day = Number(raw.incomeDayOfMonth);
  const epoch = Number(raw.historyEpoch);
  return {
    monthlyIncome:
      Number.isFinite(monthly) && monthly >= 0
        ? floorDollar(monthly)
        : base.monthlyIncome,
    incomeDayOfMonth:
      Number.isFinite(day) && day >= 1 && day <= 28
        ? Math.floor(day)
        : base.incomeDayOfMonth,
    historyEpoch:
      Number.isFinite(epoch) && epoch >= 0 ? Math.floor(epoch) : 0,
  };
}

/** Calendar days in the month containing `date` (YYYY-MM-DD). */
export function daysInMonthForDate(date: string): number {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Equal share of monthly income for each calendar day in that month.
 * Floored to whole dollars — $500 / 31 → $16; $500 / 30 → $16.
 */
export function dailyIncomeRate(
  date: string,
  monthlyIncome = DEFAULT_MONTHLY_INCOME,
): number {
  const days = daysInMonthForDate(date);
  if (days <= 0) return 0;
  return floorDollar(monthlyIncome / days);
}

export function leftoverPool(
  dailyIncome: number,
  spendTotal: number,
  lumpSum = 0,
): { leftover: number; pool: number } {
  const leftover = floorDollar(dailyIncome - spendTotal);
  const pool = floorDollar(leftover + lumpSum);
  return { leftover, pool };
}

export function activeSaveGoals(state: RebuildState): SaveGoal[] {
  return (state.saveGoals ?? []).filter((g) => g.status === "active");
}

export const RESERVE_GOAL_NAME = "Reserve";

/** Reserve holding tank — by role, or legacy name match when role omitted. */
export function isReserveGoal(
  goal: Pick<SaveGoal, "name" | "role">,
): boolean {
  if (goal.role === "reserve") return true;
  if (goal.role === "goal") return false;
  return goal.name.trim().toLowerCase() === RESERVE_GOAL_NAME.toLowerCase();
}

export function findReserveGoal(state: RebuildState): SaveGoal | undefined {
  return activeSaveGoals(state).find((g) => isReserveGoal(g));
}

export function namedSaveGoals(state: RebuildState): SaveGoal[] {
  return activeSaveGoals(state).filter((g) => !isReserveGoal(g));
}

/** Fixed $/day pace on a named goal (0 = no ETA). */
export function goalDollarsPerDay(
  goal: Pick<SaveGoal, "dollarsPerDay" | "role" | "name">,
): number {
  if (isReserveGoal(goal)) return 0;
  const n = Number(goal.dollarsPerDay);
  if (!Number.isFinite(n) || n < 0) return 0;
  return round2(n);
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
  return floorDollar(Math.max(0, goal.targetAmount - goal.savedAmount));
}

export function progressRatio(goal: Pick<SaveGoal, "targetAmount" | "savedAmount">): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(1, Math.max(0, goal.savedAmount / goal.targetAmount));
}

/**
 * Normalize active inbound %.
 * - Reserve is excluded (holding tank — weight forced to 0).
 * - Named-goal sum may be ≤ 100 (unallocated remainder is fine).
 * - Sum > 100 is scaled down to 100.
 * - Legacy equal relative weights (all `1`) become equal percents.
 */
export function normalizeInboundPercents(goals: SaveGoal[]): SaveGoal[] {
  const namedActives = goals.filter(
    (g) => g.status === "active" && !isReserveGoal(g),
  );
  const withReservePinned = goals.map((g) =>
    g.status === "active" && isReserveGoal(g)
      ? { ...g, allocationWeight: 0, role: "reserve" as const, dollarsPerDay: 0 }
      : g,
  );
  if (!namedActives.length) return withReservePinned;

  const clamped = withReservePinned.map((g) =>
    g.status === "active" && !isReserveGoal(g)
      ? {
          ...g,
          allocationWeight: round2(
            Math.min(100, Math.max(0, Number(g.allocationWeight) || 0)),
          ),
        }
      : g,
  );
  const activeClamped = clamped.filter(
    (g) => g.status === "active" && !isReserveGoal(g),
  );
  const rawSum = round2(
    activeClamped.reduce((s, g) => s + g.allocationWeight, 0),
  );

  if (rawSum <= 0) {
    const firstId = activeClamped[0].id;
    return clamped.map((g) =>
      g.status !== "active" || isReserveGoal(g)
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
 * Set one goal’s inbound % (whole percents). Always rebalances so active
 * goals sum to exactly 100 — others share the remainder by prior weight
 * (equal if all others are 0).
 */
export function setGoalInboundPercent(
  state: RebuildState,
  goalId: string,
  percent: number,
): RebuildState {
  const id = String(goalId ?? "").trim();
  const actives = activeSaveGoals(state).filter((g) => !isReserveGoal(g));
  if (!actives.some((g) => g.id === id)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const nextPct = Math.round(Number(percent));
  if (!Number.isFinite(nextPct) || nextPct < 0 || nextPct > 100) {
    throw Object.assign(new Error("Inbound % must be 0–100"), { status: 400 });
  }

  const map = new Map<string, number>();
  if (actives.length === 1) {
    map.set(id, 100);
  } else {
    const clamped = Math.min(100, Math.max(0, nextPct));
    map.set(id, clamped);
    const others = actives.filter((g) => g.id !== id);
    const remaining = 100 - clamped;
    const weights = others.map((g) => {
      const w = inboundPercent(g);
      return w > 0 ? w : 0;
    });
    const weightSum = weights.reduce((a, b) => a + b, 0);
    let assigned = 0;
    for (let i = 0; i < others.length; i++) {
      const isLast = i === others.length - 1;
      let share: number;
      if (isLast) {
        share = remaining - assigned;
      } else if (weightSum > 0) {
        share = Math.floor((remaining * weights[i]) / weightSum);
      } else {
        share = Math.floor(remaining / others.length);
      }
      map.set(others[i].id, share);
      assigned += share;
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

  const wholePool = round2(pool);
  const allocations: SaveGoalAllocation[] = [];
  let assigned = 0;
  for (let i = 0; i < recipients.length; i++) {
    const isLast = i === recipients.length - 1;
    const amount = isLast
      ? round2(wholePool - assigned)
      : round2((wholePool * weights[i]) / totalW);
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
    } else if (isReserveGoal(g)) {
      // Holding tank — never auto-mark reached from a leftover target.
      status = "active";
    } else if (savedAmount >= g.targetAmount) {
      status = "reached";
    } else if (status === "reached" && savedAmount < g.targetAmount) {
      status = "active";
    }
    return { ...g, savedAmount, status };
  });
}

/**
 * Ensure an active Reserve holding tank exists. Does **not** migrate named-goal
 * balances (founder: existing balances stay put).
 */
function ensureReserveAmongGoals(
  goals: SaveGoal[],
  createdOn: string,
): SaveGoal[] {
  const hasReserve = goals.some(
    (g) => g.status !== "archived" && isReserveGoal(g),
  );
  if (hasReserve) {
    return goals.map((g) =>
      g.status !== "archived" && isReserveGoal(g)
        ? { ...g, role: "reserve" as const, dollarsPerDay: 0 }
        : g.role
          ? g
          : { ...g, role: "goal" as const },
    );
  }
  const reserve: SaveGoal = {
    id: newId("sg"),
    name: RESERVE_GOAL_NAME,
    // Placeholder target — UI ignores to-go / ETA for Reserve.
    targetAmount: 1,
    savedAmount: 0,
    createdOn: DATE_RE.test(createdOn) ? createdOn : SAVE_GOAL_LEDGER_START,
    status: "active",
    allocationWeight: 0,
    role: "reserve",
    dollarsPerDay: 0,
  };
  return [...goals, reserve];
}

/**
 * Ledger restart: drop September 2026 closes/spends/adjusts and bump goals
 * created that month to 2026-10-01. Idempotent on every normalize.
 */
export const SAVE_GOAL_LEDGER_START = "2026-10-01";

/**
 * Bump to wipe all closes/spends/inbound overrides so Jeremy can true up
 * manually from Oct 1. Runs once per epoch on normalize.
 */
export const SAVE_GOAL_HISTORY_EPOCH = 4;

function isSeptember2026(date: string): boolean {
  return DATE_RE.test(date) && date.startsWith("2026-09-");
}

function normalizeInboundByDate(
  raw: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [date, value] of Object.entries(raw)) {
    if (!DATE_RE.test(date) || isSeptember2026(date)) continue;
    const n = round2(Number(value));
    if (!Number.isFinite(n) || n < 0) continue;
    out[date] = n;
  }
  return out;
}

/** Default daily rate, or per-day override when set. */
export function dayInboundBase(state: RebuildState, date: string): number {
  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const override = state.saveGoalInboundByDate?.[date];
  if (override !== undefined && Number.isFinite(override) && override >= 0) {
    return round2(override);
  }
  return dailyIncomeRate(date, settings.monthlyIncome);
}

export function normalizeSaveGoals(state: RebuildState): RebuildState {
  let settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const clearHistory = (settings.historyEpoch ?? 0) < SAVE_GOAL_HISTORY_EPOCH;
  if (clearHistory) {
    settings = { ...settings, historyEpoch: SAVE_GOAL_HISTORY_EPOCH };
  }

  const days = clearHistory
    ? []
    : (state.saveGoalDays ?? [])
        .filter((d) => d && DATE_RE.test(d.date))
        .filter((d) => !isSeptember2026(d.date))
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
          note:
            d.kind === "adjust" && d.note
              ? String(d.note).trim().slice(0, 80)
              : undefined,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

  let goals = recomputeSavedAmounts(
    (state.saveGoals ?? []).map((g) => {
      const rawCreated = DATE_RE.test(g.createdOn)
        ? g.createdOn
        : days[0]?.date ?? SAVE_GOAL_LEDGER_START;
      const name = String(g.name ?? "").trim() || "Save goal";
      const role: SaveGoal["role"] =
        g.role === "reserve" || g.role === "goal"
          ? g.role
          : name.trim().toLowerCase() === RESERVE_GOAL_NAME.toLowerCase()
            ? "reserve"
            : "goal";
      const dollarsRaw = Number(g.dollarsPerDay);
      const dollarsPerDay =
        role === "reserve"
          ? 0
          : Number.isFinite(dollarsRaw) && dollarsRaw > 0
            ? round2(dollarsRaw)
            : 0;
      return {
        id: String(g.id),
        name,
        targetAmount: Math.max(1, floorDollar(Number(g.targetAmount) || 1)),
        savedAmount: round2(Number(g.savedAmount) || 0),
        createdOn: isSeptember2026(rawCreated)
          ? SAVE_GOAL_LEDGER_START
          : rawCreated,
        status:
          g.status === "archived" ||
          g.status === "reached" ||
          g.status === "active"
            ? g.status
            : "active",
        allocationWeight: Number.isFinite(g.allocationWeight)
          ? Number(g.allocationWeight)
          : 0,
        role,
        dollarsPerDay,
      };
    }),
    days,
  );
  goals = ensureReserveAmongGoals(goals, days[0]?.date ?? SAVE_GOAL_LEDGER_START);
  goals = normalizeInboundPercents(goals);

  const spendEntries = clearHistory
    ? []
    : (state.saveGoalSpendEntries ?? [])
        .filter((e) => e && DATE_RE.test(e.date) && e.id)
        .filter((e) => !isSeptember2026(e.date))
        .map((e) => {
          const kind = e.kind === "add" ? ("add" as const) : ("spend" as const);
          return {
            id: String(e.id),
            date: e.date,
            amount: round2(Math.max(0, Number(e.amount) || 0)),
            kind,
            category:
              kind === "spend"
                ? coerceSaveGoalSpendCategory(e.category)
                : undefined,
            note: e.note ? String(e.note).trim().slice(0, 80) : undefined,
            at: e.at ? String(e.at) : undefined,
          };
        })
        .filter((e) => e.amount > 0)
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          if (byDate !== 0) return byDate;
          return String(a.at ?? a.id).localeCompare(String(b.at ?? b.id));
        });

  const saveGoalInboundByDate = clearHistory
    ? {}
    : normalizeInboundByDate(state.saveGoalInboundByDate);

  return {
    ...state,
    saveGoalSettings: settings,
    saveGoals: goals,
    saveGoalDays: days,
    saveGoalSpendEntries: spendEntries,
    saveGoalInboundByDate,
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

function entryKind(e: Pick<SaveGoalSpendEntry, "kind">): "spend" | "add" {
  return e.kind === "add" ? "add" : "spend";
}

/** Sum of subtract lines for a date. */
export function spendTotalForDate(state: RebuildState, date: string): number {
  return round2(
    listSaveGoalSpendEntries(state, date)
      .filter((e) => entryKind(e) === "spend")
      .reduce((s, e) => s + e.amount, 0),
  );
}

/**
 * Soft labels for spend categories used on a date (unique, oldest-first).
 * Other lines with a note show as "Other · note". Empty when none.
 */
export function spendCategoryLabelsForDate(
  state: RebuildState,
  date: string,
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const e of listSaveGoalSpendEntries(state, date)) {
    if (entryKind(e) !== "spend") continue;
    const label = saveGoalSpendEntryLabel(e);
    if (!e.category || label === "Spend" || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

/** Sum of manual add lines for a date. */
export function addTotalForDate(state: RebuildState, date: string): number {
  return round2(
    listSaveGoalSpendEntries(state, date)
      .filter((e) => entryKind(e) === "add")
      .reduce((s, e) => s + e.amount, 0),
  );
}

function hasSaveGoalClose(state: RebuildState, date: string): boolean {
  return (state.saveGoalDays ?? []).some(
    (d) => d.date === date && (d.kind ?? "close") === "close",
  );
}

/** Spend, add, or inbound override — empty calendar days do not mint roll. */
function dayHasOpenRollActivity(state: RebuildState, date: string): boolean {
  if (addTotalForDate(state, date) !== 0) return true;
  if (spendTotalForDate(state, date) !== 0) return true;
  const override = state.saveGoalInboundByDate?.[date];
  return override !== undefined && Number.isFinite(override);
}

/**
 * Day pool before Apply: base daily rate + leftover rolled from prior
 * unapplied days that had activity + manual adds − today’s spend.
 * Empty unapplied calendar days do **not** invent inbound into the roll
 * (so a wiped ledger shows only today’s rate until history is entered).
 */
export function leftoverBeforeApply(
  state: RebuildState,
  date: string,
): {
  base: number;
  carryIn: number;
  inbound: number;
  adds: number;
  spend: number;
  left: number;
} {
  if (!DATE_RE.test(date)) {
    return { base: 0, carryIn: 0, inbound: 0, adds: 0, spend: 0, left: 0 };
  }
  const start = saveGoalAccrualStart(state, date);
  if (date < start) {
    const base = dayInboundBase(state, date);
    const adds = addTotalForDate(state, date);
    const spend = spendTotalForDate(state, date);
    return {
      base,
      carryIn: 0,
      inbound: base,
      adds,
      spend,
      left: round2(base + adds - spend),
    };
  }

  let carry = 0;
  let result = {
    base: 0,
    carryIn: 0,
    inbound: 0,
    adds: 0,
    spend: 0,
    left: 0,
  };
  for (const d of datesInRange(start, date)) {
    const base = dayInboundBase(state, d);
    const adds = addTotalForDate(state, d);
    const spend = spendTotalForDate(state, d);
    if (d === date) {
      const inbound = round2(base + carry);
      const left = round2(inbound + adds - spend);
      result = { base, carryIn: carry, inbound, adds, spend, left };
      break;
    }
    if (hasSaveGoalClose(state, d)) {
      carry = 0;
      continue;
    }
    // No spend/add/override → skip; don't mint default inbound into the roll.
    if (!dayHasOpenRollActivity(state, d)) continue;
    const inbound = round2(base + carry);
    const left = round2(inbound + adds - spend);
    carry = left;
  }
  return result;
}

export function addSaveGoalSpend(
  state: RebuildState,
  input: {
    date: string;
    amount: number;
    note?: string;
    kind?: "spend" | "add";
    category?: SaveGoalSpendCategory | string;
  },
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
  const kind = input.kind === "add" ? "add" : "spend";
  let category: SaveGoalSpendCategory | undefined;
  if (kind === "spend") {
    category = coerceSaveGoalSpendCategory(input.category);
    if (!category) {
      throw Object.assign(
        new Error(
          "Pick a category: meals, snacks, clothes, entertainment, or other",
        ),
        { status: 400 },
      );
    }
  }
  const entry: SaveGoalSpendEntry = {
    id: newId("sgs"),
    date: input.date,
    amount,
    kind,
    category,
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
 * Prior open days that still roll into `asOfDate` (unapplied days with
 * spend/add/inbound activity after the last close). Empty calendar days
 * are skipped. Does not include `asOfDate` itself.
 */
export function listRolledOpenDatesBefore(
  state: RebuildState,
  asOfDate: string,
): string[] {
  if (!DATE_RE.test(asOfDate)) return [];
  const start = saveGoalAccrualStart(state, asOfDate);
  if (asOfDate <= start) return [];
  const opens: string[] = [];
  for (const d of datesInRange(start, asOfDate)) {
    if (d === asOfDate) break;
    if (hasSaveGoalClose(state, d)) {
      opens.length = 0;
    } else if (dayHasOpenRollActivity(state, d)) {
      opens.push(d);
    }
  }
  return opens;
}

/**
 * Apply today’s running ledger: positive leftover uses inbound % (or
 * custom one-bucket); negative leftover draws from `drawFromGoalId`
 * (required when >1 goals). Stops roll-forward for this date.
 * Idempotent replace of that date’s close.
 */
export function applySaveGoalDayTotals(
  state: RebuildState,
  input: {
    date: string;
    lumpSum?: number;
    /** When leftover is negative: goal to draw the overspend from */
    drawFromGoalId?: string;
    /** preset = inbound % chips; custom = dollar split or one bucket */
    leftoverMode?: LumpAllocateMode;
    leftoverGoalId?: string;
    leftoverGoalIds?: string[];
    /** Explicit dollar split for today (must sum to leftover + lump). */
    leftoverAllocations?: SaveGoalAllocation[];
  } = { date: "" },
): RebuildState {
  const date = String(input.date ?? "").trim();
  if (!DATE_RE.test(date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const leftoverMode =
    input.leftoverMode === "custom" ? ("custom" as const) : ("preset" as const);
  const { spend } = leftoverBeforeApply(state, date);
  const lumpSum = input.lumpSum !== undefined ? Number(input.lumpSum) : 0;
  const dollarSplit =
    leftoverMode === "custom" &&
    Array.isArray(input.leftoverAllocations) &&
    input.leftoverAllocations.length > 0
      ? input.leftoverAllocations.map((a) => ({
          goalId: String(a.goalId),
          amount: round2(Number(a.amount) || 0),
        }))
      : undefined;

  // Explicit dollars override leftover/lump modes for this close.
  if (dollarSplit) {
    return recordSaveGoalDay(state, {
      date,
      spendTotal: spend,
      lumpSum,
      allocations: dollarSplit,
      drawFromGoalId: input.drawFromGoalId,
      source: "manual",
    });
  }

  return recordSaveGoalDay(state, {
    date,
    spendTotal: spend,
    lumpSum,
    lumpMode: "preset",
    leftoverMode,
    leftoverGoalId:
      leftoverMode === "custom" && input.leftoverGoalId !== undefined
        ? String(input.leftoverGoalId)
        : undefined,
    leftoverGoalIds:
      leftoverMode === "custom" && Array.isArray(input.leftoverGoalIds)
        ? input.leftoverGoalIds.map((id) => String(id))
        : undefined,
    drawFromGoalId: input.drawFromGoalId,
    source: "manual",
  });
}

/**
 * Apply only rolled history before `date` (close each prior open day in
 * the roll chain). Does **not** close `date` — today’s leftover keeps rolling.
 */
export function applySaveGoalRolledOnly(
  state: RebuildState,
  input: {
    date: string;
    /** When a prior day leftover is negative: goal to draw from */
    drawFromGoalId?: string;
  },
): RebuildState {
  const date = String(input.date ?? "").trim();
  if (!DATE_RE.test(date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const prior = listRolledOpenDatesBefore(state, date);
  if (!prior.length) {
    throw Object.assign(new Error("Nothing rolled in to apply"), {
      status: 400,
    });
  }
  let next = state;
  for (const d of prior) {
    const { left } = leftoverBeforeApply(next, d);
    next = applySaveGoalDayTotals(next, {
      date: d,
      drawFromGoalId: left < 0 ? input.drawFromGoalId : undefined,
    });
  }
  return next;
}

/** Remove today’s close so leftover rolls again and goal saves reverse. */
export function undoApplySaveGoalDayTotals(
  state: RebuildState,
  date: string,
): RebuildState {
  const d = String(date ?? "").trim();
  if (!DATE_RE.test(d)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const days = state.saveGoalDays ?? [];
  const close = days.find(
    (row) => row.date === d && (row.kind ?? "close") === "close",
  );
  if (!close) {
    throw Object.assign(new Error("Nothing to undo for this day"), {
      status: 404,
    });
  }
  return normalizeSaveGoals({
    ...state,
    saveGoalDays: days.filter(
      (row) => !(row.date === d && (row.kind ?? "close") === "close"),
    ),
  });
}

/**
 * Clear subtract lines for a date and undo that day's apply (if any),
 * so goal balances reverse and the ledger can be fixed via Adjust.
 */
export function clearSaveGoalDaySpend(
  state: RebuildState,
  date: string,
): RebuildState {
  const d = String(date ?? "").trim();
  if (!DATE_RE.test(d)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const entries = state.saveGoalSpendEntries ?? [];
  const nextEntries = entries.filter(
    (e) => !(e.date === d && entryKind(e) === "spend"),
  );
  const hadSpend = nextEntries.length !== entries.length;
  const hadClose = hasSaveGoalClose(state, d);
  if (!hadSpend && !hadClose) {
    throw Object.assign(new Error("Nothing to remove for this day"), {
      status: 404,
    });
  }
  let next: RebuildState = {
    ...state,
    saveGoalSpendEntries: nextEntries,
  };
  if (hadClose) {
    next = undoApplySaveGoalDayTotals(next, d);
  }
  return normalizeSaveGoals(next);
}

/**
 * Set (or clear) the inbound for one calendar day, overwriting the default
 * monthly/days rate. Does not apply leftover into goals.
 */
export function setSaveGoalDayInbound(
  state: RebuildState,
  input: { date: string; amount: number },
): RebuildState {
  const d = String(input.date ?? "").trim();
  if (!DATE_RE.test(d)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  if (isSeptember2026(d)) {
    throw Object.assign(new Error("September 2026 is closed — start Oct 1"), {
      status: 400,
    });
  }
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error("inbound must be ≥ 0"), { status: 400 });
  }
  const prev = normalizeInboundByDate(state.saveGoalInboundByDate);
  const next = { ...prev };
  if (amount === 0) {
    delete next[d];
  } else {
    next[d] = amount;
  }
  return normalizeSaveGoals({
    ...state,
    saveGoalInboundByDate: next,
  });
}

export function createSaveGoal(
  state: RebuildState,
  input: {
    name: string;
    targetAmount: number;
    createdOn: string;
    /** When true, this goal gets 100% of daily inbound (legacy; default false) */
    claimDailyInbound?: boolean;
    /** Fixed $/day for named-goal ETA (ignored on Reserve) */
    dollarsPerDay?: number;
  },
): RebuildState {
  const name = input.name.trim().slice(0, 80);
  const targetAmount = floorDollar(Number(input.targetAmount));
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

  const isReserveName =
    name.trim().toLowerCase() === RESERVE_GOAL_NAME.toLowerCase();
  if (isReserveName && findReserveGoal(state)) {
    // Idempotent — Reserve is auto-created; creating again is a no-op.
    return normalizeSaveGoals(state);
  }

  const dollarsRaw = Number(input.dollarsPerDay);
  const dollarsPerDay =
    isReserveName || !Number.isFinite(dollarsRaw) || dollarsRaw <= 0
      ? 0
      : round2(dollarsRaw);

  const goal: SaveGoal = {
    id: newId("sg"),
    name,
    targetAmount,
    savedAmount: 0,
    createdOn: input.createdOn,
    status: "active",
    allocationWeight: claim ? 100 : 0,
    role: isReserveName ? "reserve" : "goal",
    dollarsPerDay,
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

/** Set every active named goal’s daily inbound % (must sum to 100). Reserve stays 0. */
export function setInboundPercents(
  state: RebuildState,
  percents: Record<string, number>,
): RebuildState {
  const actives = activeSaveGoals(state).filter((g) => !isReserveGoal(g));
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
      isReserveGoal(g)
        ? { ...g, allocationWeight: 0 }
        : nextMap.has(g.id)
          ? { ...g, allocationWeight: nextMap.get(g.id)! }
          : g,
    ),
  });
}

/** Chip shortcut: send 100% of daily inbound to one named goal. */
export function setSoleDailyTarget(
  state: RebuildState,
  goalId: string,
): RebuildState {
  const id = String(goalId ?? "").trim();
  const named = activeSaveGoals(state).filter((g) => !isReserveGoal(g));
  if (!named.some((g) => g.id === id)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const percents: Record<string, number> = {};
  for (const g of named) {
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
    dollarsPerDay?: number;
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
    const reserve = isReserveGoal(g);
    const name =
      input.name !== undefined ? String(input.name).trim().slice(0, 80) : g.name;
    if (!name) {
      throw Object.assign(new Error("Name required"), { status: 400 });
    }
    if (reserve && name.trim().toLowerCase() !== RESERVE_GOAL_NAME.toLowerCase()) {
      throw Object.assign(new Error("Reserve cannot be renamed"), {
        status: 400,
      });
    }
    let targetAmount = g.targetAmount;
    if (input.targetAmount !== undefined && !reserve) {
      targetAmount = floorDollar(Number(input.targetAmount));
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        throw Object.assign(new Error("Target must be greater than 0"), {
          status: 400,
        });
      }
    }
    let dollarsPerDay = goalDollarsPerDay(g);
    if (input.dollarsPerDay !== undefined) {
      if (reserve) {
        dollarsPerDay = 0;
      } else {
        const raw = Number(input.dollarsPerDay);
        if (!Number.isFinite(raw) || raw < 0) {
          throw Object.assign(new Error("Daily amount must be $0 or more"), {
            status: 400,
          });
        }
        dollarsPerDay = round2(raw);
      }
    }
    const status = input.status ?? g.status;
    return {
      ...g,
      name,
      targetAmount,
      status,
      role: reserve ? ("reserve" as const) : ("goal" as const),
      dollarsPerDay,
    };
  });

  return normalizeSaveGoals({ ...state, saveGoals: nextGoals });
}

/**
 * Set a goal’s total saved amount by writing a one-time adjust for the
 * delta vs the ledger-derived total (whole dollars).
 */
export function setSaveGoalSavedAmount(
  state: RebuildState,
  input: { id: string; savedAmount: number; date: string },
): RebuildState {
  const id = String(input.id ?? "").trim();
  if (!id) throw Object.assign(new Error("id required"), { status: 400 });
  if (!DATE_RE.test(input.date)) {
    throw Object.assign(new Error("date required"), { status: 400 });
  }
  const goal = (state.saveGoals ?? []).find((g) => g.id === id);
  if (!goal || goal.status === "archived") {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const desired = floorDollar(Number(input.savedAmount));
  if (!Number.isFinite(desired)) {
    throw Object.assign(new Error("Saved amount invalid"), { status: 400 });
  }
  const current = savedAmountFromDays(id, state.saveGoalDays ?? []);
  const delta = floorDollar(desired - current);
  if (delta === 0) return state;
  return applySaveGoalAdjustment(state, {
    date: input.date,
    amount: delta,
    mode: "custom",
    goalId: id,
  });
}

export function updateSaveGoalSettings(
  state: RebuildState,
  input: { monthlyIncome?: number; incomeDayOfMonth?: number },
): RebuildState {
  const prev = normalizeSaveGoalSettings(state.saveGoalSettings);
  const monthlyIncome =
    input.monthlyIncome !== undefined
      ? floorDollar(Number(input.monthlyIncome))
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
    saveGoalSettings: {
      monthlyIncome,
      incomeDayOfMonth,
      historyEpoch: prev.historyEpoch,
    },
  });
}

export type LumpAllocateMode = "preset" | "custom";

export type RecordSaveGoalDayInput = {
  date: string;
  spendTotal: number;
  lumpSum?: number;
  /**
   * How to place the lump (one-time). Positive leftover uses inbound %
   * unless `leftoverMode: "custom"`.
   * - preset (default): same chips / inbound % as daily
   * - custom: `lumpGoalId` (all to one) or `lumpAllocations` / `lumpGoalIds`
   */
  lumpMode?: LumpAllocateMode;
  lumpGoalId?: string;
  lumpGoalIds?: string[];
  lumpAllocations?: SaveGoalAllocation[];
  /**
   * How to place positive leftover when applying the day.
   * - preset (default): inbound % chips
   * - custom: all leftover to `leftoverGoalId` (or equal among `leftoverGoalIds`)
   */
  leftoverMode?: LumpAllocateMode;
  leftoverGoalId?: string;
  leftoverGoalIds?: string[];
  /**
   * When leftover is negative (overspend): which goal to draw from.
   * Required if more than one active goal. Single-goal days auto-pick.
   */
  drawFromGoalId?: string;
  /** @deprecated full-pool override — prefer lump* fields */
  allocations?: SaveGoalAllocation[];
  /** manual approve/evening vs auto catch-up for missed days */
  source?: "manual" | "auto";
};

/**
 * Positive leftover → inbound % (or custom one-bucket). Negative → draw
 * from one chosen goal (`drawFromGoalId`). One active goal auto-picks.
 */
function resolveLeftoverAlloc(
  leftover: number,
  goals: SaveGoal[],
  input: Pick<
    RecordSaveGoalDayInput,
    | "drawFromGoalId"
    | "leftoverMode"
    | "leftoverGoalId"
    | "leftoverGoalIds"
  >,
): SaveGoalAllocation[] {
  if (leftover === 0 || !goals.length) return [];
  if (leftover > 0) {
    if (input.leftoverMode === "custom") {
      const one = String(input.leftoverGoalId ?? "").trim();
      const many = (input.leftoverGoalIds ?? [])
        .map((id) => String(id).trim())
        .filter(Boolean);
      if (!one && many.length === 0) {
        throw Object.assign(new Error("Pick a goal for custom apply"), {
          status: 400,
        });
      }
      return resolveCustomPoolSplit(leftover, goals, {
        goalId: one || undefined,
        goalIds: many.length ? many : undefined,
      });
    }
    return splitPoolByWeight(leftover, goals);
  }

  const activeIds = new Set(goals.map((g) => g.id));
  let drawId = String(input.drawFromGoalId ?? "").trim();
  const named = goals.filter((g) => !isReserveGoal(g));
  if (!drawId && named.length === 1) {
    drawId = named[0].id;
  } else if (!drawId && goals.length === 1) {
    drawId = goals[0].id;
  }
  if (!drawId) {
    throw Object.assign(new Error("Pick a goal to take from"), {
      status: 400,
    });
  }
  if (!activeIds.has(drawId)) {
    throw Object.assign(new Error("Unknown goal to take from"), {
      status: 400,
    });
  }
  return splitPoolToOne(leftover, drawId);
}

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
    const wholePool = round2(pool);
    const sum = round2(allocations.reduce((s, a) => s + a.amount, 0));
    if (sum !== wholePool) {
      throw Object.assign(
        new Error(`Allocations must sum to $${wholePool}`),
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

  // Day total includes rolled leftover + manual adds
  const pool = leftoverBeforeApply(state, input.date);
  const dailyIncome = round2(pool.inbound + pool.adds);
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
      leftover !== 0 ? resolveLeftoverAlloc(leftover, goals, input) : [];
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
  /** Optional short reason shown in the adjustment log */
  note?: string;
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
  const amount = floorDollar(Number(input.amount));
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

  const note = input.note?.trim().slice(0, 80) || undefined;
  const day: SaveGoalDay = {
    id: newId("sga"),
    date: input.date,
    kind: "adjust",
    dailyIncome: 0,
    spendTotal: 0,
    leftover: 0,
    lumpSum: Math.max(0, amount),
    allocations,
    note,
  };

  return normalizeSaveGoals({
    ...state,
    saveGoalDays: [...(state.saveGoalDays ?? []), day],
  });
}

/** Credit the Reserve holding tank (Adjust inbound / top-ups). */
export function creditSaveGoalReserve(
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
  const withReserve = normalizeSaveGoals(state);
  const reserve = findReserveGoal(withReserve);
  if (!reserve) {
    throw Object.assign(new Error("Reserve not found"), { status: 404 });
  }
  const note = input.note?.trim().slice(0, 80) || "Inbound";
  const day: SaveGoalDay = {
    id: newId("sga"),
    date: input.date,
    kind: "adjust",
    dailyIncome: 0,
    spendTotal: 0,
    leftover: 0,
    lumpSum: amount,
    allocations: [{ goalId: reserve.id, amount }],
    note,
  };
  return normalizeSaveGoals({
    ...withReserve,
    saveGoalDays: [...(withReserve.saveGoalDays ?? []), day],
  });
}

/**
 * Move money Reserve → named goal. Caps at available Reserve balance.
 * Existing named-goal balances are never migrated automatically.
 */
export function transferSaveGoalFromReserve(
  state: RebuildState,
  input: { date: string; amount: number; toGoalId: string; note?: string },
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
  const toGoalId = String(input.toGoalId ?? "").trim();
  if (!toGoalId) {
    throw Object.assign(new Error("Pick a goal to fund"), { status: 400 });
  }

  const withReserve = normalizeSaveGoals(state);
  const reserve = findReserveGoal(withReserve);
  if (!reserve) {
    throw Object.assign(new Error("Reserve not found"), { status: 404 });
  }
  if (toGoalId === reserve.id) {
    throw Object.assign(new Error("Pick a named goal, not Reserve"), {
      status: 400,
    });
  }
  const dest = activeSaveGoals(withReserve).find((g) => g.id === toGoalId);
  if (!dest || isReserveGoal(dest)) {
    throw Object.assign(new Error("Save goal not found"), { status: 404 });
  }
  const available = round2(Math.max(0, reserve.savedAmount));
  if (amount > available) {
    throw Object.assign(
      new Error(
        available <= 0
          ? "Reserve is empty"
          : `Only ${formatMoney(available)} available in Reserve`,
      ),
      { status: 400 },
    );
  }

  const note =
    input.note?.trim().slice(0, 80) ||
    `Transfer → ${dest.name}`.slice(0, 80);
  const day: SaveGoalDay = {
    id: newId("sga"),
    date: input.date,
    kind: "adjust",
    dailyIncome: 0,
    spendTotal: 0,
    leftover: 0,
    lumpSum: 0,
    allocations: [
      { goalId: reserve.id, amount: round2(-amount) },
      { goalId: dest.id, amount: round2(amount) },
    ],
    note,
  };

  return normalizeSaveGoals({
    ...withReserve,
    saveGoalDays: [...(withReserve.saveGoalDays ?? []), day],
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

/** YYYY-MM from a calendar date. */
export function calendarMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** "September 2026" from YYYY-MM. */
export function formatCalendarMonthLabel(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return monthKey;
  }
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export type SaveGoalMonthSummary = {
  monthKey: string;
  /** Close-day allocation totals per goal (net applied that month). */
  appliedByGoalId: Record<string, number>;
  /** Categorized spend totals for the month (predefined buckets only). */
  spendByCategory: Partial<Record<SaveGoalSpendCategory, number>>;
  /** Close days in the month, newest first. */
  days: SaveGoalDay[];
};

/**
 * Roll up applied closes + categorized spend for one calendar month.
 * `today` marks the in-progress month (not used for math — caller decides collapse).
 */
export function summarizeSaveGoalMonth(
  state: RebuildState,
  monthKey: string,
): SaveGoalMonthSummary {
  const prefix = `${monthKey}-`;
  const days = listSaveGoalCloseDays(state).filter((d) =>
    d.date.startsWith(prefix),
  );
  const appliedByGoalId: Record<string, number> = {};
  for (const day of days) {
    for (const a of day.allocations ?? []) {
      appliedByGoalId[a.goalId] = round2(
        (appliedByGoalId[a.goalId] ?? 0) + a.amount,
      );
    }
  }
  const spendByCategory: Partial<Record<SaveGoalSpendCategory, number>> = {};
  for (const e of state.saveGoalSpendEntries ?? []) {
    if (!e.date.startsWith(prefix) || entryKind(e) !== "spend") continue;
    const cat = coerceSaveGoalSpendCategory(e.category);
    if (!cat) continue;
    spendByCategory[cat] = round2((spendByCategory[cat] ?? 0) + e.amount);
  }
  return { monthKey, appliedByGoalId, spendByCategory, days };
}

/**
 * Prior close days grouped by calendar month (newest month first).
 * Current month stays expanded as daily cards; completed months collapse.
 */
export function groupSaveGoalClosesByMonth(
  state: RebuildState,
  today: string,
): Array<{
  monthKey: string;
  /** True when monthKey === today’s YYYY-MM — always show daily rows. */
  isCurrentMonth: boolean;
  summary: SaveGoalMonthSummary;
}> {
  if (!DATE_RE.test(today)) return [];
  const currentMonth = calendarMonthKey(today);
  const closes = listSaveGoalCloseDays(state).filter((d) => d.date !== today);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const d of closes) {
    const mk = calendarMonthKey(d.date);
    if (seen.has(mk)) continue;
    seen.add(mk);
    keys.push(mk);
  }
  keys.sort((a, b) => b.localeCompare(a));
  return keys.map((monthKey) => ({
    monthKey,
    isCurrentMonth: monthKey === currentMonth,
    summary: summarizeSaveGoalMonth(state, monthKey),
  }));
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
      const goalAmount = floorDollar(
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
  if (isReserveGoal(goal)) {
    throw Object.assign(new Error("Reserve cannot be deleted"), {
      status: 400,
    });
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
          { goalId: id, amount: floorDollar(-amount) },
          { goalId: reallocateTo, amount: floorDollar(amount) },
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
  return floorDollar(sum / prior.length);
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

/**
 * Project a target date for a **named** goal from remaining ÷ fixed $/day.
 * Reserve has no payoff ETA (holding tank). Recalculates on read so transfers
 * that raise savedAmount move the date immediately.
 */
export function projectSaveGoalTargetDate(
  state: RebuildState,
  goal: SaveGoal,
  today: string,
): SaveGoalProjection {
  const remaining0 = round2(goal.targetAmount - goal.savedAmount);

  if (isReserveGoal(goal)) {
    return {
      goalId: goal.id,
      remaining: Math.max(0, remaining0),
      projectedPoolPerDay: 0,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "needs_leftover",
    };
  }

  if (remaining0 <= 0 || goal.status === "reached") {
    return {
      goalId: goal.id,
      remaining: Math.max(0, remaining0),
      projectedPoolPerDay: 0,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "reached",
    };
  }

  const goalDaily = goalDollarsPerDay(goal);
  if (goalDaily <= 0) {
    return {
      goalId: goal.id,
      remaining: remaining0,
      projectedPoolPerDay: 0,
      goalDaily: 0,
      etaDays: null,
      targetDate: null,
      status: "needs_leftover",
    };
  }

  const etaDays = Math.ceil(remaining0 / goalDaily);
  return {
    goalId: goal.id,
    remaining: remaining0,
    projectedPoolPerDay: goalDaily,
    goalDaily,
    etaDays,
    targetDate: addDays(today, etaDays),
    status: "on_track",
  };
}

/** Always include year — goals often land next calendar year. */
export function formatTargetDateLabel(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Exact dollars+cents for ledger lines and saved totals. */
export function formatMoney(n: number): string {
  const amount = round2(n);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

/** Floored whole dollars for glance day totals / rate. */
export function formatMoneyDown(n: number): string {
  return formatMoney(floorDollar(n));
}
