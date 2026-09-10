import { MILESTONE_DEFS, type AlignmentStatus, type EveningCheckIn, type MilestoneDef, type RebuildState, type SkipItemKey, type SupportCompletion, type SupportConfig, type SupportType } from "./types";

export type { SkipItemKey };

/** Local calendar date YYYY-MM-DD in a timezone */
export function todayInTz(timezone = "America/Los_Angeles"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Home header — weekday + full date only */
export function formatHomeHeaderDate(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Calendar day (YYYY-MM-DD) of the most recent Start or Close the day,
 * whichever was completed later. Null if neither exists.
 */
export function lastActiveDay(
  state: Pick<RebuildState, "mornings" | "evenings">,
): string | null {
  let bestAt = -1;
  let bestDay: string | null = null;
  for (const m of state.mornings ?? []) {
    const at = Date.parse(m.completedAt);
    if (Number.isNaN(at) || at < bestAt) continue;
    bestAt = at;
    bestDay = m.date;
  }
  for (const e of state.evenings ?? []) {
    const at = Date.parse(e.completedAt);
    if (Number.isNaN(at) || at < bestAt) continue;
    bestAt = at;
    bestDay = e.date;
  }
  return bestDay;
}

/** M-D-YYYY without forced zero-padding (e.g. 8-10-2026) */
export function formatSinceDate(date: string): string {
  const d = parseDate(date);
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

/** Whole calendar days from `from` to `to` (can be negative). */
export function calendarDaysBetween(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Sunday → Saturday week containing `date` */
export function weekBounds(date: string): { start: string; end: string } {
  const d = parseDate(date);
  const day = d.getDay(); // 0 Sun
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
}

export function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * Clean days this run = calendar abstinence days on the current run.
 * Day 1 is the start date itself (before any evening check-in).
 * Pass `asOfDate` (YYYY-MM-DD) to evaluate a specific day; defaults to today in profile TZ.
 */
export function cleanDaysThisRun(
  state: RebuildState,
  asOfDate?: string,
): number {
  if (!state.profile) return 0;
  const start = state.profile.currentRunStartedOn;
  const asOf = asOfDate ?? todayInTz(state.profile.timezone);
  if (asOf < start) return 0;
  return calendarDaysBetween(start, asOf) + 1;
}

export function totalLifetimeCleanDays(state: RebuildState): number {
  return state.evenings.filter((e) => e.alignment === "aligned").length;
}

export function moneyReclaimed(state: RebuildState): number {
  return state.transfers.reduce((sum, t) => sum + t.amount, 0);
}

export function moneySetAside(state: RebuildState): number {
  return moneyReclaimed(state);
}

export function waitingReclaimDays(state: RebuildState) {
  return state.reclaimDays.filter((d) => !d.accounted);
}

export function waitingReclaimTotal(state: RebuildState): number {
  return waitingReclaimDays(state).reduce((s, d) => s + d.estimatedAmount, 0);
}

export function daysAccounted(state: RebuildState): {
  accounted: number;
  eligible: number;
} {
  const eligible = state.reclaimDays.length;
  const accounted = state.reclaimDays.filter((d) => d.accounted).length;
  return { accounted, eligible };
}

export function nextMilestones(
  cleanDays: number,
  count = 3,
): MilestoneDef[] {
  return MILESTONE_DEFS.filter((m) => m.dayNumber > cleanDays).slice(0, count);
}

/** Next cashable / treat-or-save milestone (skips checkpoints). */
export function nextIncentive(cleanDays: number): MilestoneDef | undefined {
  return MILESTONE_DEFS.find(
    (m) =>
      m.dayNumber > cleanDays &&
      (m.type === "reward" || m.type === "destination"),
  );
}

export function nextIncentives(cleanDays: number, count = 2): MilestoneDef[] {
  return MILESTONE_DEFS.filter(
    (m) =>
      m.dayNumber > cleanDays &&
      (m.type === "reward" || m.type === "destination"),
  ).slice(0, count);
}

export function milestoneAt(dayNumber: number): MilestoneDef | undefined {
  return MILESTONE_DEFS.find((m) => m.dayNumber === dayNumber);
}

/** Projected reclaim value if user stays clean to targetDay (this run) */
export function projectedReclaimAt(
  state: RebuildState,
  targetCleanDay: number,
  asOfDate?: string,
): number {
  if (!state.profile) return 0;
  const current = cleanDaysThisRun(state, asOfDate);
  const daily = state.profile.historicalDailySpend;
  const already = moneyReclaimed(state);
  const waiting = waitingReclaimTotal(state);
  const daysToGo = Math.max(0, targetCleanDay - current);
  return already + waiting + daysToGo * daily;
}

/**
 * Reward scale grows with milestone day number.
 * Base = dailySpend * dayNumber * factor, floored.
 * Later milestones get incrementally larger suggested pools.
 */
export function suggestedRewardPool(dayNumber: number, dailySpend: number): number {
  const curve = 0.35 + Math.min(dayNumber, 365) / 365 * 0.45;
  return Math.round(dailySpend * dayNumber * curve);
}

/** Non-run workouts logged in range (feeds Gym weekly target on Home). */
export function gymWorkoutsInRange(
  state: RebuildState,
  start: string,
  end: string,
): number {
  return (state.workouts ?? []).filter((w) => {
    if (w.date < start || w.date > end) return false;
    const type =
      w.type ??
      (w.category === "run"
        ? "run"
        : w.liftType === "hiit"
          ? "hiit"
          : w.liftType === "stretch"
            ? "stretch"
            : "lift");
    return type !== "run";
  }).length;
}

export function weeklySupportProgress(
  state: RebuildState,
  date: string,
): { type: SupportType; label: string; target: number; done: number }[] {
  if (!state.profile) return [];
  const { start, end } = weekBounds(date);
  return state.profile.supports
    .filter((s) => s.enabled)
    .map((s) => {
      const done =
        s.type === "gym"
          ? gymWorkoutsInRange(state, start, end)
          : state.supports.filter(
              (c) =>
                c.supportType === s.type &&
                c.completed &&
                c.date >= start &&
                c.date <= end,
            ).length;
      return {
        type: s.type,
        label: s.label,
        target: s.weeklyTarget,
        // Allow over-goal (e.g. 5 of 2) — targets are aspirational, not caps.
        done,
      };
    });
}

export function weekFullyComplete(
  state: RebuildState,
  date: string,
): boolean {
  const progress = weeklySupportProgress(state, date);
  if (progress.length === 0) return false;
  return progress.every((p) => p.done >= p.target);
}

export function getEvening(state: RebuildState, date: string) {
  return state.evenings.find((e) => e.date === date);
}

/**
 * Calendar days in the current run (start → asOf) with no evening close yet.
 * Newest first. Used to backfill a missed Close the day / journal line.
 */
export function missingEveningDates(
  state: RebuildState,
  asOfDate?: string,
): string[] {
  if (!state.profile) return [];
  const start = state.profile.currentRunStartedOn;
  const asOf = asOfDate ?? todayInTz(state.profile.timezone);
  if (asOf < start) return [];
  const closed = new Set(state.evenings.map((e) => e.date));
  return datesInRange(start, asOf)
    .filter((d) => !closed.has(d))
    .reverse();
}

/** YYYY-MM-DD calendar date suitable for evening close / backfill. */
export function isValidEveningDate(
  state: RebuildState,
  date: string,
  asOfDate?: string,
): boolean {
  if (!state.profile) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const asOf = asOfDate ?? todayInTz(state.profile.timezone);
  const start = state.profile.currentRunStartedOn;
  return date >= start && date <= asOf;
}

export function getMorning(state: RebuildState, date: string) {
  return state.mornings.find((m) => m.date === date);
}

export function supportsForDate(state: RebuildState, date: string) {
  return state.supports.filter((s) => s.date === date && s.completed);
}

export function isSkippedToday(
  state: RebuildState,
  date: string,
  itemKey: SkipItemKey,
): boolean {
  return (state.skips ?? []).some(
    (s) => s.date === date && s.itemKey === itemKey,
  );
}

export function isSupportDoneToday(
  state: RebuildState,
  date: string,
  type: SupportType,
): boolean {
  return state.supports.some(
    (s) => s.date === date && s.supportType === type && s.completed,
  );
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function emptyState(): RebuildState {
  return {
    profile: null,
    mornings: [],
    evenings: [],
    supports: [],
    reclaimDays: [],
    transfers: [],
    rewards: [],
    milestones: [],
    returns: [],
    cravings: [],
    weeklyBonuses: [],
    journals: [],
    starredDays: [],
    skips: [],
    fund: { future: 0, treat: 0 },
    consecutiveSaves: 0,
    milestoneDecisions: [],
    reminderLog: {},
    listenedPodcasts: [],
    dayProvisions: [],
    quoteLog: [],
    workouts: [],
    workoutPrs: [],
    workoutRoutines: [],
    vitals: [],
    dailyCrossword: { attempts: 0, completed: 0 },
  };
}

export function assignedRewardForMilestone(
  state: RebuildState,
  dayNumber: number,
) {
  return state.rewards.find(
    (r) => r.assignedMilestoneDay === dayNumber && !r.executed,
  );
}

/** Claimed treat for a trail day in the current run (name + optional photo). */
export function claimedRewardForTrailDay(
  state: RebuildState,
  dayNumber: number,
) {
  const outcome = rewardOutcomeForTrailDay(state, dayNumber);
  return outcome?.kind === "treat" ? outcome.reward : undefined;
}

export type TrailRewardOutcome =
  | {
      kind: "pending";
      moment: { id: string; dayNumber: number; title: string; type: string };
    }
  | {
      kind: "save";
      moment: { id: string; dayNumber: number; title: string; type: string };
      decision: RebuildState["milestoneDecisions"][number];
    }
  | {
      kind: "treat";
      moment: { id: string; dayNumber: number; title: string; type: string };
      decision: RebuildState["milestoneDecisions"][number];
      reward?: RebuildState["rewards"][number];
    };

/** Save / claim / still-open outcome for a reward or destination day. */
export function rewardOutcomeForTrailDay(
  state: RebuildState,
  dayNumber: number,
): TrailRewardOutcome | undefined {
  if (!state.profile) return undefined;
  const runId = state.profile.currentRunId;
  const moment = state.milestones.find(
    (m) =>
      m.runId === runId &&
      m.dayNumber === dayNumber &&
      (m.type === "reward" || m.type === "destination"),
  );
  if (!moment) {
    const def = MILESTONE_DEFS.find((d) => d.dayNumber === dayNumber);
    if (!def || (def.type !== "reward" && def.type !== "destination")) {
      return undefined;
    }
    return undefined;
  }
  const decision = state.milestoneDecisions.find(
    (d) => d.milestoneAchievementId === moment.id,
  );
  if (!decision) {
    return { kind: "pending", moment };
  }
  if (decision.choice === "save") {
    return { kind: "save", moment, decision };
  }
  const reward = decision.rewardId
    ? state.rewards.find((r) => r.id === decision.rewardId)
    : undefined;
  return { kind: "treat", moment, decision, reward };
}

export function isCashableMilestoneDay(dayNumber: number): boolean {
  const def = MILESTONE_DEFS.find((d) => d.dayNumber === dayNumber);
  return Boolean(def && (def.type === "reward" || def.type === "destination"));
}

export function moneyReinvested(state: RebuildState): number {
  return state.rewards
    .filter((r) => r.executed)
    .reduce((s, r) => s + (r.actualCost ?? r.estimatedCost), 0);
}

export type DashboardSnapshot = {
  cleanDays: number;
  label: string;
  sinceLabel: string;
  reclaimed: number;
  waiting: number;
  waitingDays: number;
  accounted: number;
  eligible: number;
  next: MilestoneDef[];
  week: ReturnType<typeof weeklySupportProgress>;
  todayMorning?: ReturnType<typeof getMorning>;
  todayEvening?: ReturnType<typeof getEvening>;
  todaySupports: SupportCompletion[];
  todaySkips: string[];
};

export function buildDashboard(
  state: RebuildState,
  today: string,
): DashboardSnapshot | null {
  if (!state.profile) return null;
  const cleanDays = cleanDaysThisRun(state, today);
  const { accounted, eligible } = daysAccounted(state);
  const waiting = waitingReclaimDays(state);
  return {
    cleanDays,
    label: `Day ${cleanDays}`,
    sinceLabel: `Run started ${formatSinceDate(state.profile.currentRunStartedOn)}`,
    reclaimed: moneyReclaimed(state),
    waiting: waitingReclaimTotal(state),
    waitingDays: waiting.length,
    accounted,
    eligible,
    next: nextMilestones(cleanDays, 3),
    week: weeklySupportProgress(state, today),
    todayMorning: getMorning(state, today),
    todayEvening: getEvening(state, today),
    todaySupports: supportsForDate(state, today),
    todaySkips: (state.skips ?? [])
      .filter((s) => s.date === today)
      .map((s) => s.itemKey),
  };
}

export function alignmentLabel(a: AlignmentStatus): string {
  switch (a) {
    case "aligned":
      return "Yes — stayed aligned";
    case "return_to_use":
      return "Return to use";
    case "other":
      return "Something else happened";
  }
}

export function supportLabel(
  supports: SupportConfig[],
  type: SupportType,
): string {
  return supports.find((s) => s.type === type)?.label ?? type;
}
