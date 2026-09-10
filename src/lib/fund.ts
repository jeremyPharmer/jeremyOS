import {
  calendarDaysBetween,
  cleanDaysThisRun,
  newId,
  waitingReclaimTotal,
} from "./journey";
import type {
  FundLedger,
  MilestoneAchievement,
  RebuildState,
  Reward,
} from "./types";
import {
  normalizeRoutines,
  normalizeWorkout,
  normalizeWorkoutPrs,
} from "./workouts";

export function emptyFund(): FundLedger {
  return { future: 0, treat: 0 };
}

export function fundTotal(fund: FundLedger): number {
  return round2((fund.future ?? 0) + (fund.treat ?? 0) + (fund.rebuild ?? 0));
}

/** Fold legacy Rebuild bucket into Future; two-bucket model only. */
export function normalizeFund(fund: FundLedger | undefined): FundLedger {
  const raw = fund ?? emptyFund();
  const legacyRebuild = raw.rebuild ?? 0;
  return {
    future: round2((raw.future ?? 0) + legacyRebuild),
    treat: round2(raw.treat ?? 0),
  };
}

export function normalizeState(state: RebuildState): RebuildState {
  return {
    ...state,
    skips: state.skips ?? [],
    starredDays: normalizeStarredDays(state.starredDays),
    fund: normalizeFund(state.fund),
    consecutiveSaves: state.consecutiveSaves ?? 0,
    milestoneDecisions: state.milestoneDecisions ?? [],
    listenedPodcasts: state.listenedPodcasts ?? [],
    reminderLog: state.reminderLog ?? {},
    dayProvisions: state.dayProvisions ?? [],
    quoteLog: state.quoteLog ?? [],
    workouts: (state.workouts ?? []).map(normalizeWorkout),
    workoutPrs: normalizeWorkoutPrs(state.workoutPrs),
    workoutRoutines: normalizeRoutines(state.workoutRoutines),
    calendarTitleOverrides: state.calendarTitleOverrides ?? {},
    calendarHiddenEventIds: state.calendarHiddenEventIds ?? [],
    customAgendaEvents: state.customAgendaEvents ?? [],
    vitals: state.vitals ?? [],
    dailyCrossword: {
      attempts: Math.max(0, Math.floor(state.dailyCrossword?.attempts ?? 0)),
      completed: Math.max(0, Math.floor(state.dailyCrossword?.completed ?? 0)),
      current: state.dailyCrossword?.current,
    },
  };
}

/** Unique sorted YYYY-MM-DD bookmarks */
export function normalizeStarredDays(days?: string[]): string[] {
  if (!days?.length) return [];
  const seen = new Set<string>();
  for (const d of days) {
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      seen.add(d);
    }
  }
  return [...seen].sort();
}

/** Recommended default: Future 30% / Treat Yourself 70% (user can set at onboarding). */
export const FUTURE_SPLIT = 0.3;
export const TREAT_SPLIT = 0.7;

/** Clamp and normalize Treat share; Future is the remainder. Allows 0–100. */
export function normalizeTreatSplit(treatSplit?: number): number {
  if (!Number.isFinite(treatSplit)) return TREAT_SPLIT;
  const t = Number(treatSplit);
  if (t > 1) {
    // allow 0–100 style percents
    return Math.min(1, Math.max(0, Math.round(t) / 100));
  }
  return Math.min(1, Math.max(0, t));
}

export function splitTransfer(
  amount: number,
  treatSplit: number = TREAT_SPLIT,
): FundLedger {
  const treatShare = normalizeTreatSplit(treatSplit);
  const treat = round2(amount * treatShare);
  const future = round2(amount - treat);
  return { future, treat };
}

export function profileTreatSplit(state: {
  profile?: { treatSplit?: number } | null;
}): number {
  return normalizeTreatSplit(state.profile?.treatSplit);
}

export function applySplitToFund(
  fund: FundLedger,
  split: FundLedger,
): FundLedger {
  const base = normalizeFund(fund);
  return {
    future: round2(base.future + (split.future ?? 0)),
    treat: round2(base.treat + (split.treat ?? 0)),
  };
}

/**
 * Debit Treat first, then Future for any remaining cost.
 * `futurePull` opts in to and caps how much Future may cover.
 */
export function spendFromTreatAndFuture(
  fund: FundLedger,
  cost: number,
  futurePull?: number,
): FundLedger {
  const base = normalizeFund(fund);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw Object.assign(new Error("Item cost must be > 0"), { status: 400 });
  }
  if (
    futurePull !== undefined &&
    (!Number.isFinite(futurePull) || futurePull < 0)
  ) {
    throw Object.assign(new Error("Future pull must be a non-negative amount"), {
      status: 400,
    });
  }

  const fromTreat = Math.min(base.treat, cost);
  const deficit = round2(cost - fromTreat);
  const maxPull = futurePull === undefined ? 0 : round2(futurePull);
  const fromFuture = Math.min(base.future, deficit, maxPull);

  if (round2(fromTreat + fromFuture) < cost) {
    throw Object.assign(
      new Error(
        "Not enough in Treat Yourself + Future pull for this item — pick a cheaper treat or pull more from Future",
      ),
      { status: 400 },
    );
  }

  return {
    future: round2(base.future - fromFuture),
    treat: round2(base.treat - fromTreat),
  };
}

export function pendingCashableMoments(
  state: RebuildState,
): MilestoneAchievement[] {
  const decided = new Set(
    state.milestoneDecisions.map((d) => d.milestoneAchievementId),
  );
  return state.milestones.filter(
    (m) =>
      m.rewardEligible &&
      !decided.has(m.id) &&
      (m.type === "reward" || m.type === "destination"),
  );
}

export function mustTreat(state: RebuildState): boolean {
  return (state.consecutiveSaves ?? 0) >= 2;
}

/**
 * Fund available by a future incentive day:
 * current balances + the user's Treat/Future split of
 * (waiting reclaim + days-to-go × daily).
 */
export function projectedFundAt(
  state: RebuildState,
  targetCleanDay: number,
  asOfDate?: string,
): FundLedger & { total: number } {
  if (!state.profile) {
    return { future: 0, treat: 0, total: 0 };
  }
  const current = cleanDaysThisRun(state, asOfDate);
  const daily = state.profile.historicalDailySpend;
  const waiting = waitingReclaimTotal(state);
  const daysToGo = Math.max(0, targetCleanDay - current);
  const incoming = waiting + daysToGo * daily;
  const split = splitTransfer(incoming, profileTreatSplit(state));
  const now = normalizeFund(state.fund);
  const treat = round2(now.treat + split.treat);
  const future = round2(now.future + split.future);
  return { future, treat, total: round2(treat + future) };
}

/**
 * Treat Yourself available by a future incentive day:
 * current Treat Yourself balance + the Treat share of
 * (waiting reclaim + days-to-go × daily).
 */
export function projectedTreatYourselfAt(
  state: RebuildState,
  targetCleanDay: number,
  asOfDate?: string,
): number {
  return projectedFundAt(state, targetCleanDay, asOfDate).treat;
}

/** Affordable if Treat + Future can cover (optional Future pull). */
export function eligibleWishlist(state: RebuildState): Reward[] {
  const fund = normalizeFund(state.fund);
  const ceiling = round2(fund.treat + fund.future);
  return state.rewards.filter((r) => !r.executed && r.estimatedCost <= ceiling);
}

/**
 * Wishlist items you can assign to a future incentive:
 * cost ≤ Treat Yourself you will have on that day (not today's Treat balance).
 * Already-assigned items stay listed so the assignment can be changed.
 */
export function eligibleWishlistForIncentive(
  state: RebuildState,
  targetCleanDay: number,
  asOfDate?: string,
): Reward[] {
  const ceiling = projectedTreatYourselfAt(state, targetCleanDay, asOfDate);
  return state.rewards.filter(
    (r) =>
      !r.executed &&
      (r.estimatedCost <= ceiling ||
        r.assignedMilestoneDay === targetCleanDay),
  );
}

function treatShareOfTransfer(
  state: RebuildState,
  transfer: RebuildState["transfers"][number],
): number {
  if (transfer.split?.treat != null) return transfer.split.treat;
  return splitTransfer(transfer.amount, profileTreatSplit(state)).treat;
}

/** Current-run clean-day number for a calendar date, or null if before this run. */
function cleanDayOnRun(state: RebuildState, date: string): number | null {
  const start = state.profile?.currentRunStartedOn;
  if (!start || date < start) return null;
  return calendarDaysBetween(start, date) + 1;
}

/**
 * Treat share of Moves for current-run days *after* a clean-day number.
 * That later accrual is the running Treat total, not this reward's shop budget.
 */
export function treatAccruedAfterCleanDay(
  state: RebuildState,
  targetCleanDay: number,
): number {
  let treat = 0;
  for (const transfer of state.transfers) {
    const dates = transfer.dayDates ?? [];
    if (dates.length === 0) continue;
    const share = treatShareOfTransfer(state, transfer) / dates.length;
    for (const date of dates) {
      const day = cleanDayOnRun(state, date);
      if (day != null && day > targetCleanDay) treat += share;
    }
  }
  return round2(treat);
}

/** Latest unlocked Reward/Destination this run that has not been spent. */
export function lastShopReward(
  state: RebuildState,
): MilestoneAchievement | undefined {
  const runId = state.profile?.currentRunId;
  const spent = new Set(
    (state.milestoneDecisions ?? [])
      .filter((d) => d.choice === "treat" && d.amount > 0)
      .map((d) => d.milestoneAchievementId),
  );
  const open = state.milestones.filter(
    (m) =>
      m.rewardEligible &&
      (m.type === "reward" || m.type === "destination") &&
      (!runId || m.runId === runId) &&
      !spent.has(m.id),
  );
  if (open.length === 0) return undefined;
  return open.reduce((best, m) =>
    m.dayNumber >= best.dayNumber ? m : best,
  );
}

/**
 * Treat Yourself you may shop with right now:
 * Treat earned through the last reached reward that has not been spent —
 * not the running Treat total from Moves after that day.
 * Save for the Future does not close the shop (you did not spend).
 */
export function shoppingTreatBudget(state: RebuildState): number {
  const moment = lastShopReward(state);
  if (!moment) return 0;
  const treatNow = normalizeFund(state.fund).treat;
  const later = treatAccruedAfterCleanDay(state, moment.dayNumber);
  return round2(Math.max(0, treatNow - later));
}

export function availableShopRewards(state: RebuildState): Reward[] {
  const ceiling = shoppingTreatBudget(state);
  return state.rewards.filter(
    (r) => !r.executed && r.estimatedCost <= ceiling,
  );
}

export function otherShopRewards(state: RebuildState): Reward[] {
  const ceiling = shoppingTreatBudget(state);
  return state.rewards.filter(
    (r) => !r.executed && r.estimatedCost > ceiling,
  );
}

/**
 * Save for the Future — skip spending short-term Treat this reward moment.
 * Does not move money into Treat (old Save & compound direction retired).
 * `note` is required: how you rewarded yourself (can be free / non-spend).
 */
export function saveForFuture(
  state: RebuildState,
  milestoneAchievementId: string,
  note?: string,
  photoId?: string,
): RebuildState {
  const moment = state.milestones.find((m) => m.id === milestoneAchievementId);
  if (!moment || !moment.rewardEligible) {
    throw Object.assign(new Error("Milestone not cashable"), { status: 400 });
  }
  if (
    state.milestoneDecisions.some(
      (d) => d.milestoneAchievementId === milestoneAchievementId,
    )
  ) {
    throw Object.assign(new Error("Already decided"), { status: 409 });
  }
  if (mustTreat(state)) {
    throw Object.assign(
      new Error("Treat Yourself required — Save for the Future not allowed"),
      { status: 400 },
    );
  }
  const trimmed = String(note ?? "").trim();
  if (!trimmed) {
    throw Object.assign(
      new Error("Tell us how you are rewarding yourself today"),
      { status: 400 },
    );
  }

  const rewardId = newId("reward");
  const reward: Reward = {
    id: rewardId,
    name: trimmed,
    category: "other",
    estimatedCost: 0,
    actualCost: 0,
    assignedMilestoneDay: moment.dayNumber,
    executed: true,
    executedAt: new Date().toISOString(),
    notes: `Day ${moment.dayNumber} · Saved $ for future`,
    photoId,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    fund: normalizeFund(state.fund),
    consecutiveSaves: (state.consecutiveSaves ?? 0) + 1,
    rewards: [...state.rewards, reward],
    milestoneDecisions: [
      ...state.milestoneDecisions,
      {
        id: newId("decision"),
        milestoneAchievementId,
        dayNumber: moment.dayNumber,
        choice: "save",
        amount: 0,
        rewardId,
        note: trimmed,
        photoId,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/** @deprecated use saveForFuture — kept for API alias during ship */
export function saveCompound(
  state: RebuildState,
  milestoneAchievementId: string,
  _amount?: number,
  note?: string,
  photoId?: string,
): RebuildState {
  return saveForFuture(state, milestoneAchievementId, note, photoId);
}

/**
 * Spend a wishlist item from the Rewards shop.
 * Uses Treat Yourself earned through the last unspent reward (not the
 * running Treat total). If that reward is still undecided, this is the
 * Treat claim. After Save, it only debits Treat — the decision already stands.
 */
export function executeWishlist(
  state: RebuildState,
  rewardId: string,
  actualCost?: number,
  notes?: string,
  futurePull?: number,
): RebuildState {
  const moment = lastShopReward(state);
  if (!moment) {
    throw Object.assign(
      new Error("Shop opens when a reward is ready to claim"),
      { status: 400 },
    );
  }

  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward || reward.executed) {
    throw Object.assign(new Error("Wishlist item not available"), {
      status: 400,
    });
  }

  const cost =
    actualCost !== undefined && Number.isFinite(actualCost)
      ? actualCost
      : reward.estimatedCost;
  const budget = shoppingTreatBudget(state);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw Object.assign(new Error("Enter how much you spent"), { status: 400 });
  }
  if (cost > budget) {
    throw Object.assign(
      new Error(
        "That costs more than Treat Yourself from your last reward — pick something in the shop or wait for the next one",
      ),
      { status: 400 },
    );
  }

  const alreadyDecided = (state.milestoneDecisions ?? []).some(
    (d) => d.milestoneAchievementId === moment.id,
  );
  if (!alreadyDecided) {
    return treatYourself(
      state,
      moment.id,
      rewardId,
      notes,
      futurePull,
      undefined,
      cost,
    );
  }

  const fund = spendFromTreatAndFuture(state.fund, cost, futurePull);
  return {
    ...state,
    fund,
    consecutiveSaves: 0,
    rewards: state.rewards.map((r) =>
      r.id === rewardId
        ? {
            ...r,
            executed: true,
            executedAt: new Date().toISOString(),
            actualCost: cost,
            notes: notes || r.notes,
            assignedMilestoneDay: moment.dayNumber,
          }
        : r,
    ),
  };
}

export function treatYourself(
  state: RebuildState,
  milestoneAchievementId: string,
  rewardId: string,
  note?: string,
  futurePull?: number,
  photoId?: string,
  actualCost?: number,
): RebuildState {
  const moment = state.milestones.find((m) => m.id === milestoneAchievementId);
  if (!moment || !moment.rewardEligible) {
    throw Object.assign(new Error("Milestone not cashable"), { status: 400 });
  }
  if (
    state.milestoneDecisions.some(
      (d) => d.milestoneAchievementId === milestoneAchievementId,
    )
  ) {
    throw Object.assign(new Error("Already decided"), { status: 409 });
  }

  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward || reward.executed) {
    throw Object.assign(new Error("Pick a wishlist item"), { status: 400 });
  }

  const cost =
    actualCost !== undefined && Number.isFinite(actualCost)
      ? actualCost
      : reward.estimatedCost;
  if (!Number.isFinite(cost) || cost <= 0) {
    throw Object.assign(new Error("Enter how much you spent"), { status: 400 });
  }
  const fund = spendFromTreatAndFuture(state.fund, cost, futurePull);

  return {
    ...state,
    fund,
    consecutiveSaves: 0,
    rewards: state.rewards.map((r) =>
      r.id === rewardId
        ? {
            ...r,
            executed: true,
            executedAt: new Date().toISOString(),
            actualCost: cost,
            notes: note || r.notes,
            assignedMilestoneDay: moment.dayNumber,
            photoId: photoId || r.photoId,
          }
        : r,
    ),
    milestoneDecisions: [
      ...state.milestoneDecisions,
      {
        id: newId("decision"),
        milestoneAchievementId,
        dayNumber: moment.dayNumber,
        choice: "treat",
        amount: cost,
        rewardId,
        note,
        photoId,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Claim without a pre-assigned wishlist item: name + optional note/photo.
 * No fund debit — celebration record only.
 */
export function claimCelebration(
  state: RebuildState,
  milestoneAchievementId: string,
  name: string,
  note?: string,
  photoId?: string,
): RebuildState {
  const moment = state.milestones.find((m) => m.id === milestoneAchievementId);
  if (!moment || !moment.rewardEligible) {
    throw Object.assign(new Error("Milestone not cashable"), { status: 400 });
  }
  if (
    state.milestoneDecisions.some(
      (d) => d.milestoneAchievementId === milestoneAchievementId,
    )
  ) {
    throw Object.assign(new Error("Already decided"), { status: 409 });
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Tell us how you treated yourself"), {
      status: 400,
    });
  }

  const rewardId = newId("reward");
  const reward: Reward = {
    id: rewardId,
    name: trimmed,
    category: "other",
    estimatedCost: 0,
    actualCost: 0,
    assignedMilestoneDay: moment.dayNumber,
    executed: true,
    executedAt: new Date().toISOString(),
    notes: note,
    photoId,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    fund: normalizeFund(state.fund),
    consecutiveSaves: 0,
    rewards: [...state.rewards, reward],
    milestoneDecisions: [
      ...state.milestoneDecisions,
      {
        id: newId("decision"),
        milestoneAchievementId,
        dayNumber: moment.dayNumber,
        choice: "treat",
        amount: 0,
        rewardId,
        note,
        photoId,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
