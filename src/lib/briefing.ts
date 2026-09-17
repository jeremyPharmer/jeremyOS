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
  /** Today's morning values (when logged). */
  todayMood: number | null;
  todayEnergy: number | null;
  todayStress: number | null;
  todaySleepQuality: number | null;
  todaySleepHours: number | null;
  /** Trailing 7-day averages (excluding today when possible). */
  moodAvg: number | null;
  energyAvg: number | null;
  stressAvg: number | null;
  sleepQualityAvg: number | null;
  sleepHoursAvg: number | null;
  /** Today minus last-week avg — positive = today higher. */
  moodVsLastWeek: number | null;
  energyVsLastWeek: number | null;
  stressVsLastWeek: number | null;
  sleepQualityVsLastWeek: number | null;
  sleepHoursVsLastWeek: number | null;
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

function vsLastWeek(
  todayVal: number | null,
  weekAvg: number | null,
  minDelta: number,
): number | null {
  if (todayVal == null || weekAvg == null) return null;
  const delta = todayVal - weekAvg;
  if (Math.abs(delta) < minDelta) return 0;
  return delta;
}

function comparePhrase(
  delta: number | null,
  weekAvg: number | null,
  opts: {
    formatWeek?: (n: number) => string;
  } = {},
): string | null {
  if (delta == null || weekAvg == null) return null;
  const week = opts.formatWeek?.(weekAvg) ?? weekAvg.toFixed(1);
  if (delta === 0) return `even with last week (${week})`;
  if (delta > 0) return `up vs last week ${week}`;
  return `down vs last week ${week}`;
}

/**
 * Today’s check-in vs the trailing week average (“The last week”).
 * Week average prefers the 7 days before today; falls back to the last 7
 * including today when prior history is thin.
 */
export function sevenDayTrendInsight(
  state: RebuildState,
  today: string,
): SevenDayTrendInsight {
  const weekStart = addDays(today, -6);
  const priorStart = addDays(today, -7);
  const priorEnd = addDays(today, -1);

  const weekPoints = trendPointsInRange(state, weekStart, today);
  const priorPoints = trendPointsInRange(state, priorStart, priorEnd);
  const byDate = new Map(weekPoints.map((p) => [p.date, p]));
  const todayPoint = weekPoints.find((p) => p.date === today) ?? null;

  const moodSeries: (number | undefined)[] = [];
  const sleepQualitySeries: (number | undefined)[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const p = byDate.get(date);
    moodSeries.push(p?.mood);
    sleepQualitySeries.push(p?.sleepQuality);
  }

  const todayMood = todayPoint?.mood ?? null;
  const todayEnergy = todayPoint?.energy ?? null;
  const todayStress = todayPoint?.stress ?? null;
  const todaySleepQuality = todayPoint?.sleepQuality ?? null;
  const todaySleepHours = todayPoint?.sleepHours ?? null;

  const priorMoods = collectMetric(priorPoints, "mood");
  const priorEnergies = collectMetric(priorPoints, "energy");
  const priorStresses = collectMetric(priorPoints, "stress");
  const priorQualities = collectMetric(priorPoints, "sleepQuality");
  const priorHours = collectMetric(priorPoints, "sleepHours");

  const usePrior = (vals: number[]) => vals.length >= 3;
  const weekMoods = usePrior(priorMoods)
    ? priorMoods
    : collectMetric(weekPoints, "mood");
  const weekEnergies = usePrior(priorEnergies)
    ? priorEnergies
    : collectMetric(weekPoints, "energy");
  const weekStresses = usePrior(priorStresses)
    ? priorStresses
    : collectMetric(weekPoints, "stress");
  const weekQualities = usePrior(priorQualities)
    ? priorQualities
    : collectMetric(weekPoints, "sleepQuality");
  const weekHours = usePrior(priorHours)
    ? priorHours
    : collectMetric(weekPoints, "sleepHours");

  const moodAvg = avg(weekMoods);
  const energyAvg = avg(weekEnergies);
  const stressAvg = avg(weekStresses);
  const sleepQualityAvg = avg(weekQualities);
  const sleepHoursAvg = avg(weekHours);

  const moodVsLastWeek = vsLastWeek(todayMood, moodAvg, 0.35);
  const energyVsLastWeek = vsLastWeek(todayEnergy, energyAvg, 0.35);
  const stressVsLastWeek = vsLastWeek(todayStress, stressAvg, 0.35);
  const sleepQualityVsLastWeek = vsLastWeek(
    todaySleepQuality,
    sleepQualityAvg,
    0.35,
  );
  const sleepHoursVsLastWeek = vsLastWeek(todaySleepHours, sleepHoursAvg, 0.25);

  const lines: string[] = [];

  if (todaySleepHours != null || todaySleepQuality != null) {
    const bits: string[] = [];
    if (todaySleepHours != null) {
      const cmp = comparePhrase(sleepHoursVsLastWeek, sleepHoursAvg, {
        formatWeek: (n) => `${hoursLabel(n)}h`,
      });
      bits.push(
        cmp
          ? `${hoursLabel(todaySleepHours)}h sleep — ${cmp}`
          : `${hoursLabel(todaySleepHours)}h sleep today`,
      );
    }
    if (todaySleepQuality != null) {
      const cmp = comparePhrase(sleepQualityVsLastWeek, sleepQualityAvg);
      bits.push(
        cmp
          ? `quality ${todaySleepQuality} — ${cmp}`
          : `quality ${todaySleepQuality} today`,
      );
    }
    lines.push(`Sleep today: ${bits.join("; ")}.`);
  } else if (sleepHoursAvg != null || sleepQualityAvg != null) {
    const bits: string[] = [];
    if (sleepHoursAvg != null) {
      bits.push(`${hoursLabel(sleepHoursAvg)}h sleep avg`);
    }
    if (sleepQualityAvg != null) {
      bits.push(`quality ${sleepQualityAvg.toFixed(1)}`);
    }
    lines.push(`Sleep last week: ${bits.join("; ")}.`);
  }

  if (todayMood != null) {
    const cmp = comparePhrase(moodVsLastWeek, moodAvg);
    lines.push(
      cmp
        ? `Mood today ${todayMood} — ${cmp}.`
        : `Mood today ${todayMood}.`,
    );
  } else if (moodAvg != null) {
    lines.push(`Mood averaging ${moodAvg.toFixed(1)} over the last week.`);
  } else {
    lines.push("Not enough mood check-ins yet for a weekly read.");
  }

  if (todayEnergy != null) {
    const cmp = comparePhrase(energyVsLastWeek, energyAvg);
    lines.push(
      cmp
        ? `Energy today ${todayEnergy} — ${cmp}.`
        : `Energy today ${todayEnergy}.`,
    );
  } else if (energyAvg != null) {
    lines.push(`Energy averaging ${energyAvg.toFixed(1)} over the last week.`);
  }

  if (todayStress != null) {
    const cmp = comparePhrase(stressVsLastWeek, stressAvg);
    lines.push(
      cmp
        ? `Stress today ${todayStress} — ${cmp}.`
        : `Stress today ${todayStress}.`,
    );
  } else if (stressAvg != null) {
    lines.push(`Stress averaging ${stressAvg.toFixed(1)} over the last week.`);
  }

  return {
    todayMood,
    todayEnergy,
    todayStress,
    todaySleepQuality,
    todaySleepHours,
    moodAvg,
    energyAvg,
    stressAvg,
    sleepQualityAvg,
    sleepHoursAvg,
    moodVsLastWeek,
    energyVsLastWeek,
    stressVsLastWeek,
    sleepQualityVsLastWeek,
    sleepHoursVsLastWeek,
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
