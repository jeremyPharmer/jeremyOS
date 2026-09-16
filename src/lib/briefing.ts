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
  moodDelta: number | null;
  energyDelta: number | null;
  stressDelta: number | null;
  sleepQualityDelta: number | null;
  sleepHoursDelta: number | null;
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

function seriesDelta(values: number[]): number | null {
  const recent = values.slice(-3);
  const prior = values.slice(0, Math.max(0, values.length - 3));
  if (recent.length < 2 || prior.length < 2) return null;
  return (avg(recent) ?? 0) - (avg(prior) ?? 0);
}

function hoursLabel(n: number): string {
  const rounded = Math.round(n * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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

  const moodDelta = seriesDelta(moods);
  const energyDelta = seriesDelta(energies);
  const stressDelta = seriesDelta(stresses);
  const sleepQualityDelta = seriesDelta(qualities);
  const sleepHoursDelta = seriesDelta(hours);

  const lines: string[] = [];

  if (sleepHoursAvg != null || sleepQualityAvg != null) {
    const bits: string[] = [];
    if (sleepHoursAvg != null) {
      const tw = trendWord(sleepHoursDelta, "up a bit", "down a bit");
      bits.push(
        tw
          ? `${hoursLabel(sleepHoursAvg)}h sleep avg — ${tw}`
          : `${hoursLabel(sleepHoursAvg)}h sleep avg`,
      );
    }
    if (sleepQualityAvg != null) {
      const tw = trendWord(sleepQualityDelta, "trending up", "softening");
      bits.push(
        tw
          ? `quality ${sleepQualityAvg.toFixed(1)} — ${tw}`
          : `quality ${sleepQualityAvg.toFixed(1)}`,
      );
    }
    lines.push(`Sleep over 7 days: ${bits.join("; ")}.`);
  }

  if (moodAvg != null) {
    const tw = trendWord(
      moodDelta,
      "lifting vs earlier this week",
      "softer vs earlier this week",
    );
    lines.push(
      tw
        ? `Mood averaging ${moodAvg.toFixed(1)} — ${tw}.`
        : `Mood averaging ${moodAvg.toFixed(1)} over the last 7 days.`,
    );
  } else {
    lines.push("Not enough mood check-ins yet for a 7-day read.");
  }

  if (energyAvg != null) {
    const tw = trendWord(energyDelta, "building", "fading");
    lines.push(
      tw
        ? `Energy averaging ${energyAvg.toFixed(1)} — ${tw}.`
        : `Energy averaging ${energyAvg.toFixed(1)} over the last 7 days.`,
    );
  }

  if (stressAvg != null) {
    const tw = trendWord(
      stressDelta,
      "creeping up",
      "easing vs earlier this week",
    );
    lines.push(
      tw
        ? `Stress averaging ${stressAvg.toFixed(1)} — ${tw}.`
        : `Stress averaging ${stressAvg.toFixed(1)} over the last 7 days.`,
    );
  }

  return {
    moodAvg,
    energyAvg,
    stressAvg,
    sleepQualityAvg,
    sleepHoursAvg,
    moodDelta,
    energyDelta,
    stressDelta,
    sleepQualityDelta,
    sleepHoursDelta,
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
