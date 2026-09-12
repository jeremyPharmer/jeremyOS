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
import { trendPointsInRange } from "./trends";
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
  return `This day in history · ${formatMonthDayLong(today)}`;
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
  sleepQualityAvg: number | null;
  sleepHoursAvg: number | null;
  moodDelta: number | null;
  sleepQualityDelta: number | null;
  lines: string[];
  moodSeries: (number | undefined)[];
  sleepQualitySeries: (number | undefined)[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendWord(
  delta: number | null,
  up: string,
  down: string,
): string | null {
  if (delta == null || Math.abs(delta) < 0.35) return null;
  return delta > 0 ? up : down;
}

/** Last 7 calendar days through today (inclusive). */
export function sevenDayTrendInsight(
  state: RebuildState,
  today: string,
): SevenDayTrendInsight {
  const start = addDays(today, -6);
  const points = trendPointsInRange(state, start, today);
  const byDate = new Map(points.map((p) => [p.date, p]));

  const moodSeries: (number | undefined)[] = [];
  const sleepQualitySeries: (number | undefined)[] = [];
  const moods: number[] = [];
  const qualities: number[] = [];
  const hours: number[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const p = byDate.get(date);
    moodSeries.push(p?.mood);
    sleepQualitySeries.push(p?.sleepQuality);
    if (p?.mood != null) moods.push(p.mood);
    if (p?.sleepQuality != null) qualities.push(p.sleepQuality);
    if (p?.sleepHours != null) hours.push(p.sleepHours);
  }

  const moodAvg = avg(moods);
  const sleepQualityAvg = avg(qualities);
  const sleepHoursAvg = avg(hours);

  const recentMood = moods.slice(-3);
  const priorMood = moods.slice(0, Math.max(0, moods.length - 3));
  const recentSq = qualities.slice(-3);
  const priorSq = qualities.slice(0, Math.max(0, qualities.length - 3));
  const moodDelta =
    recentMood.length >= 2 && priorMood.length >= 2
      ? (avg(recentMood) ?? 0) - (avg(priorMood) ?? 0)
      : null;
  const sleepQualityDelta =
    recentSq.length >= 2 && priorSq.length >= 2
      ? (avg(recentSq) ?? 0) - (avg(priorSq) ?? 0)
      : null;

  const lines: string[] = [];
  if (moodAvg != null) {
    const tw = trendWord(
      moodDelta,
      "up vs earlier this week",
      "down vs earlier this week",
    );
    lines.push(
      tw
        ? `Mood averaging ${moodAvg.toFixed(1)} this week — ${tw}.`
        : `Mood averaging ${moodAvg.toFixed(1)} over the last 7 days.`,
    );
  } else {
    lines.push("Not enough mood check-ins yet for a 7-day read.");
  }
  if (sleepQualityAvg != null) {
    const tw = trendWord(sleepQualityDelta, "trending up", "softening a bit");
    lines.push(
      tw
        ? `Sleep quality averaging ${sleepQualityAvg.toFixed(1)} — ${tw}.`
        : `Sleep quality averaging ${sleepQualityAvg.toFixed(1)} over the last 7 days.`,
    );
  }
  if (sleepHoursAvg != null) {
    lines.push(`Sleep amount averaging ${sleepHoursAvg.toFixed(1)} / 10.`);
  }

  return {
    moodAvg,
    sleepQualityAvg,
    sleepHoursAvg,
    moodDelta,
    sleepQualityDelta,
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
