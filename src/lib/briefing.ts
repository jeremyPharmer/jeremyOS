/**
 * Shared Daily briefing helpers (RB-032) — history, workouts, 7-day trends.
 * Rules-based; no LLM.
 */

import { addDays, calendarDaysBetween } from "./journey";
import {
  bundleJournalsByDate,
  formatMonthDayLong,
  monthDayKey,
  type DayBundle,
} from "./journal";
import { trendPointsInRange, type TrendPoint } from "./trends";
import type {
  JournalEntry,
  RebuildState,
  WorkoutLog,
  WorkoutType,
} from "./types";
import { WORKOUT_TYPES, workoutTypeLabel } from "./workouts";

export type ThisDayHistoryEntry = {
  date: string;
  year: number;
  headline?: string;
  summary?: string;
  photoId?: string;
};

/** All past journal days for this month-day (newest year first). Excludes `today`. */
export function thisDayInHistory(
  journals: JournalEntry[],
  today: string,
): ThisDayHistoryEntry[] {
  const mmDd = monthDayKey(today);
  const byDate = bundleJournalsByDate(journals);
  const entries: ThisDayHistoryEntry[] = [];
  for (const [date, bundle] of byDate) {
    if (date === today) continue;
    if (monthDayKey(date) !== mmDd) continue;
    if (!bundle.headline?.trim() && !bundle.summary?.trim()) continue;
    entries.push({
      date,
      year: Number(date.slice(0, 4)),
      headline: bundle.headline,
      summary: bundle.summary,
      photoId: bundle.photoId,
    });
  }
  return entries.sort((a, b) => b.year - a.year);
}

export function thisDayInHistoryTitle(today: string): string {
  return `On this date · ${formatMonthDayLong(today)}`;
}

export type WorkoutGapInsight = {
  daysSinceAny: number | null;
  anyLabel: string;
  longestType: WorkoutType | null;
  daysSinceType: number | null;
  typeLabel: string;
  typeGaps: { type: WorkoutType; label: string; daysSince: number | null }[];
};

function lastWorkoutDate(
  workouts: WorkoutLog[],
  predicate: (w: WorkoutLog) => boolean,
): string | null {
  let best: string | null = null;
  for (const w of workouts) {
    if (!predicate(w)) continue;
    if (!best || w.date > best) best = w.date;
  }
  return best;
}

function daysSince(today: string, last: string | null): number | null {
  if (!last) return null;
  return Math.max(0, calendarDaysBetween(last, today));
}

export function workoutGapInsight(
  workouts: WorkoutLog[] | undefined,
  today: string,
): WorkoutGapInsight {
  const list = workouts ?? [];
  const lastAny = lastWorkoutDate(list, () => true);
  const daysSinceAny = daysSince(today, lastAny);

  const typeGaps = WORKOUT_TYPES.map(({ id, label }) => {
    const last = lastWorkoutDate(list, (w) => w.type === id);
    return { type: id, label, daysSince: daysSince(today, last) };
  });

  let longestType: WorkoutType | null = null;
  let daysSinceType: number | null = null;
  for (const row of typeGaps) {
    const gap = row.daysSince ?? Number.POSITIVE_INFINITY;
    const best = daysSinceType ?? -1;
    if (gap > best) {
      longestType = row.type;
      daysSinceType = row.daysSince;
    }
  }

  const anyLabel =
    daysSinceAny == null
      ? "No workouts logged yet — a short session would open the streak."
      : daysSinceAny === 0
        ? "You already moved today."
        : daysSinceAny === 1
          ? "1 day since any workout."
          : `${daysSinceAny} days since any workout.`;

  const typeLabel =
    longestType == null
      ? "No typed workout history yet."
      : daysSinceType == null
        ? `Longest type gap: ${workoutTypeLabel(longestType)} — never logged.`
        : daysSinceType === 0
          ? `Most recent type focus: ${workoutTypeLabel(longestType)} (today).`
          : `Longest type gap: ${workoutTypeLabel(longestType)} · ${daysSinceType} day${daysSinceType === 1 ? "" : "s"}.`;

  return {
    daysSinceAny,
    anyLabel,
    longestType,
    daysSinceType,
    typeLabel,
    typeGaps,
  };
}

export type SevenDayTrendInsight = {
  moodAvg: number | null;
  energyAvg: number | null;
  stressAvg: number | null;
  sleepQualityAvg: number | null;
  sleepHoursAvg: number | null;
  /** 7-day avg minus all-time (or prior) avg — positive = this week higher. */
  moodVsAllTime: number | null;
  energyVsAllTime: number | null;
  stressVsAllTime: number | null;
  sleepQualityVsAllTime: number | null;
  sleepHoursVsAllTime: number | null;
  lines: string[];
  moodSeries: (number | undefined)[];
  sleepQualitySeries: (number | undefined)[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function hoursLabel(n: number): string {
  const rounded = Math.round(n * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function collectMetric(
  points: TrendPoint[],
  key: keyof Omit<TrendPoint, "date">,
): number[] {
  const out: number[] = [];
  for (const p of points) {
    const v = p[key];
    if (typeof v === "number") out.push(v);
  }
  return out;
}

/**
 * Compare this week's average to the baseline (prefer history before this week).
 * Returns delta (week − baseline) or null if not enough data.
 */
function vsBaseline(
  weekAvg: number | null,
  weekValues: number[],
  allPoints: TrendPoint[],
  weekStart: string,
  key: keyof Omit<TrendPoint, "date">,
  minDelta: number,
): { delta: number | null; baselineAvg: number | null } {
  if (weekAvg == null) return { delta: null, baselineAvg: null };

  const prior = allPoints.filter((p) => p.date < weekStart);
  let baselineVals = collectMetric(prior, key);
  // Fall back to full history when there isn't a prior baseline yet.
  if (baselineVals.length < 3) {
    baselineVals = collectMetric(allPoints, key);
  }
  // Need a broader sample than this week alone.
  if (baselineVals.length < 3 || baselineVals.length <= weekValues.length) {
    return { delta: null, baselineAvg: avg(baselineVals) };
  }

  const baselineAvg = avg(baselineVals);
  if (baselineAvg == null) return { delta: null, baselineAvg: null };
  const delta = weekAvg - baselineAvg;
  if (Math.abs(delta) < minDelta) {
    return { delta: 0, baselineAvg };
  }
  return { delta, baselineAvg };
}

function comparePhrase(
  delta: number | null,
  baselineAvg: number | null,
  opts: {
    up: string;
    down: string;
    even: string;
    formatBaseline?: (n: number) => string;
  },
): string | null {
  if (delta == null || baselineAvg == null) return null;
  const base =
    opts.formatBaseline?.(baselineAvg) ?? baselineAvg.toFixed(1);
  if (delta === 0) return `${opts.even} (all-time ${base})`;
  if (delta > 0) return `${opts.up} all-time ${base}`;
  return `${opts.down} all-time ${base}`;
}

/** Last 7 calendar days through today, compared to all-time baseline. */
export function sevenDayTrendInsight(
  state: RebuildState,
  today: string,
): SevenDayTrendInsight {
  const start = addDays(today, -6);
  const journeyStart =
    state.profile?.startDate ??
    state.mornings.map((m) => m.date).sort()[0] ??
    start;
  const allPoints = trendPointsInRange(state, journeyStart, today);
  const weekPoints = trendPointsInRange(state, start, today);
  const byDate = new Map(weekPoints.map((p) => [p.date, p]));

  const moodSeries: (number | undefined)[] = [];
  const sleepQualitySeries: (number | undefined)[] = [];
  const moods: number[] = [];
  const energies: number[] = [];
  const stresses: number[] = [];
  const qualities: number[] = [];
  const hours: number[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const p = byDate.get(date);
    moodSeries.push(p?.mood);
    sleepQualitySeries.push(p?.sleepQuality);
    if (p?.mood != null) moods.push(p.mood);
    if (p?.energy != null) energies.push(p.energy);
    if (p?.stress != null) stresses.push(p.stress);
    if (p?.sleepQuality != null) qualities.push(p.sleepQuality);
    if (p?.sleepHours != null) hours.push(p.sleepHours);
  }

  const moodAvg = avg(moods);
  const energyAvg = avg(energies);
  const stressAvg = avg(stresses);
  const sleepQualityAvg = avg(qualities);
  const sleepHoursAvg = avg(hours);

  const moodCmp = vsBaseline(moodAvg, moods, allPoints, start, "mood", 0.35);
  const energyCmp = vsBaseline(
    energyAvg,
    energies,
    allPoints,
    start,
    "energy",
    0.35,
  );
  const stressCmp = vsBaseline(
    stressAvg,
    stresses,
    allPoints,
    start,
    "stress",
    0.35,
  );
  const sleepQualityCmp = vsBaseline(
    sleepQualityAvg,
    qualities,
    allPoints,
    start,
    "sleepQuality",
    0.35,
  );
  const sleepHoursCmp = vsBaseline(
    sleepHoursAvg,
    hours,
    allPoints,
    start,
    "sleepHours",
    0.25,
  );

  const lines: string[] = [];

  if (sleepHoursAvg != null || sleepQualityAvg != null) {
    const bits: string[] = [];
    if (sleepHoursAvg != null) {
      const cmp = comparePhrase(
        sleepHoursCmp.delta,
        sleepHoursCmp.baselineAvg,
        {
          up: "up vs",
          down: "down vs",
          even: "even with all-time",
          formatBaseline: (n) => `${hoursLabel(n)}h`,
        },
      );
      bits.push(
        cmp
          ? `${hoursLabel(sleepHoursAvg)}h sleep — ${cmp}`
          : `${hoursLabel(sleepHoursAvg)}h sleep avg`,
      );
    }
    if (sleepQualityAvg != null) {
      const cmp = comparePhrase(
        sleepQualityCmp.delta,
        sleepQualityCmp.baselineAvg,
        {
          up: "up vs",
          down: "down vs",
          even: "even with all-time",
        },
      );
      bits.push(
        cmp
          ? `quality ${sleepQualityAvg.toFixed(1)} — ${cmp}`
          : `quality ${sleepQualityAvg.toFixed(1)}`,
      );
    }
    lines.push(`Sleep this week: ${bits.join("; ")}.`);
  }

  if (moodAvg != null) {
    const cmp = comparePhrase(moodCmp.delta, moodCmp.baselineAvg, {
      up: "up vs",
      down: "down vs",
      even: "even with all-time",
    });
    lines.push(
      cmp
        ? `Mood averaging ${moodAvg.toFixed(1)} — ${cmp}.`
        : `Mood averaging ${moodAvg.toFixed(1)} over the last 7 days.`,
    );
  } else {
    lines.push("Not enough mood check-ins yet for a 7-day read.");
  }

  if (energyAvg != null) {
    const cmp = comparePhrase(energyCmp.delta, energyCmp.baselineAvg, {
      up: "up vs",
      down: "down vs",
      even: "even with all-time",
    });
    lines.push(
      cmp
        ? `Energy averaging ${energyAvg.toFixed(1)} — ${cmp}.`
        : `Energy averaging ${energyAvg.toFixed(1)} over the last 7 days.`,
    );
  }

  if (stressAvg != null) {
    // For stress, "up" means higher stress (worse) — still say up/down vs all-time clearly.
    const cmp = comparePhrase(stressCmp.delta, stressCmp.baselineAvg, {
      up: "up vs",
      down: "down vs",
      even: "even with all-time",
    });
    lines.push(
      cmp
        ? `Stress averaging ${stressAvg.toFixed(1)} — ${cmp}.`
        : `Stress averaging ${stressAvg.toFixed(1)} over the last 7 days.`,
    );
  }

  return {
    moodAvg,
    energyAvg,
    stressAvg,
    sleepQualityAvg,
    sleepHoursAvg,
    moodVsAllTime: moodCmp.delta,
    energyVsAllTime: energyCmp.delta,
    stressVsAllTime: stressCmp.delta,
    sleepQualityVsAllTime: sleepQualityCmp.delta,
    sleepHoursVsAllTime: sleepHoursCmp.delta,
    lines,
    moodSeries,
    sleepQualitySeries,
  };
}

/** Prefer a readable excerpt for history cards. */
export function historyExcerpt(
  bundle: Pick<DayBundle, "headline" | "summary">,
): string {
  const summary = bundle.summary?.trim();
  if (summary) {
    return summary.length > 180
      ? `${summary.slice(0, 177).trim()}…`
      : summary;
  }
  return bundle.headline?.trim() || "";
}
