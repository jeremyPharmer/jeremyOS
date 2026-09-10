import {
  addDays,
  calendarDaysBetween,
  datesInRange,
  formatDisplayDate,
  weekBounds,
} from "./journey";
import type { RebuildState, SupportType } from "./types";

export type ConditionMetric =
  | "sleepHours"
  | "sleepQuality"
  | "mood"
  | "energy"
  | "stress";

export type ConditionAxis = "scale" | "hours";

export type TrendPoint = {
  date: string;
  sleepHours?: number;
  sleepQuality?: number;
  mood?: number;
  energy?: number;
  stress?: number;
};

export type CravingPointsPoint = {
  date: string;
  /** Sum of intensityBefore for craving events that calendar day. */
  points: number;
  /**
   * Sum of remaining intensity: intensityAfter when logged, else before.
   * Incomplete events do not look like a drop to zero.
   */
  remaining: number;
  /** Sum of (before − after) for events that logged after. */
  dropped: number;
};

export const PLAYBOOK_MIN_N = 3;

export type PlaybookRow = {
  outcome: string;
  n: number;
  avgDrop: number;
};

export type DaypartKey = "morning" | "afternoon" | "evening" | "night";

export type DaypartBucket = {
  key: DaypartKey;
  label: string;
  hoursLabel: string;
  count: number;
  avgBefore: number;
};

export type WeekdayBucket = {
  weekday: number;
  label: string;
  count: number;
  avgBefore: number;
};

export type HeadwindHours = {
  total: number;
  byDaypart: DaypartBucket[];
  byWeekday: WeekdayBucket[];
  /** Set when one daypart strictly leads. */
  peak?: { key: DaypartKey; label: string; hoursLabel: string; count: number };
};

export type RhythmWeek = {
  start: string;
  end: string;
  label: string;
  isCurrent: boolean;
};

export type SupportRhythm = {
  type: SupportType;
  label: string;
  target: number;
  weeks: { start: string; done: number; target: number }[];
  /**
   * Mean daily craving-before points on active days with vs without this support.
   * Omitted when either side has fewer than 3 active days.
   */
  contrast?: {
    withSupport: { days: number; avgPoints: number };
    withoutSupport: { days: number; avgPoints: number };
  };
};

const DAYPARTS: {
  key: DaypartKey;
  label: string;
  hoursLabel: string;
  hours: number[];
}[] = [
  {
    key: "morning",
    label: "Morning",
    hoursLabel: "5am–noon",
    hours: [5, 6, 7, 8, 9, 10, 11],
  },
  {
    key: "afternoon",
    label: "Afternoon",
    hoursLabel: "noon–5pm",
    hours: [12, 13, 14, 15, 16],
  },
  {
    key: "evening",
    label: "Evening",
    hoursLabel: "5pm–9pm",
    hours: [17, 18, 19, 20],
  },
  {
    key: "night",
    label: "Night",
    hoursLabel: "9pm–5am",
    hours: [21, 22, 23, 0, 1, 2, 3, 4],
  },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function profileTz(state: RebuildState): string {
  return state.profile?.timezone ?? "America/Los_Angeles";
}

export function dateKeyFromIso(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function hourInTz(iso: string, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(iso));
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    return Number.isFinite(hour) ? hour : 0;
  } catch {
    return new Date(iso).getUTCHours();
  }
}

function weekdayFromDateKey(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function daypartForHour(hour: number): (typeof DAYPARTS)[number] {
  return (
    DAYPARTS.find((p) => p.hours.includes(hour)) ?? DAYPARTS[DAYPARTS.length - 1]
  );
}

function mitigationLabels(c: {
  outcomes?: string[];
  outcome?: string;
  intervention: string;
}): string[] {
  if (c.outcomes?.length) {
    return c.outcomes.map((o) => o.trim()).filter(Boolean);
  }
  const outcome = String(c.outcome ?? "").trim();
  if (outcome && outcome.toLowerCase() !== "delay") {
    if (outcome.includes(",")) {
      return outcome
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [outcome];
  }
  const intervention = String(c.intervention ?? "").trim();
  if (intervention && intervention.toLowerCase() !== "delay") {
    if (intervention.includes(",")) {
      return intervention
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [intervention];
  }
  return [];
}

export type ConditionRangePreset = "30" | "60" | "90" | "all" | "custom";

/** Morning state metrics (1–10). Mood can fall back to evening. No morning craving. */
export function trendPointsInRange(
  state: RebuildState,
  startBound: string,
  endBound: string,
): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();

  for (const m of state.mornings) {
    if (m.date < startBound || m.date > endBound) continue;
    byDate.set(m.date, {
      date: m.date,
      sleepHours: m.sleepHours,
      sleepQuality: m.sleepQuality,
      mood: m.mood,
      energy: m.energy,
      stress: m.stress,
    });
  }

  for (const e of state.evenings) {
    if (e.date < startBound || e.date > endBound) continue;
    const existing = byDate.get(e.date) ?? { date: e.date };
    if (existing.mood === undefined) existing.mood = e.mood;
    byDate.set(e.date, existing);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** One point per calendar day in range (empty days included) for chart x-axis scaling. */
export function filledTrendPointsInRange(
  state: RebuildState,
  startBound: string,
  endBound: string,
): TrendPoint[] {
  const logged = new Map(
    trendPointsInRange(state, startBound, endBound).map((p) => [p.date, p]),
  );
  return datesInRange(startBound, endBound).map(
    (date) => logged.get(date) ?? { date },
  );
}

/** @deprecated prefer trendPointsInRange with an explicit window */
export function trendPointsLastYear(
  state: RebuildState,
  asOfDate: string,
): TrendPoint[] {
  return trendPointsInRange(state, addDays(asOfDate, -364), asOfDate);
}

function clampDate(date: string, min: string, max: string): string {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

/** Resolve preset/custom bounds for the Conditions chart (clamped to current journey). */
export function resolveConditionRange(
  preset: ConditionRangePreset,
  journeyStart: string,
  asOfDate: string,
  custom?: { start: string; end: string },
): { start: string; end: string } {
  const end = asOfDate;
  const minStart = journeyStart;

  if (preset === "all") {
    return { start: minStart, end };
  }

  if (preset === "custom" && custom) {
    const start = clampDate(custom.start, minStart, end);
    const customEnd = clampDate(custom.end, minStart, end);
    return start <= customEnd
      ? { start, end: customEnd }
      : { start: customEnd, end: start };
  }

  const daysBack =
    preset === "30" ? 29 : preset === "60" ? 59 : preset === "90" ? 89 : 0;
  if (daysBack === 0) {
    return { start: minStart, end };
  }
  const rollingStart = addDays(end, -daysBack);
  const start = rollingStart < minStart ? minStart : rollingStart;
  return { start, end };
}

/**
 * Daily craving intensity: before, remaining after, and drop.
 * Uses profile timezone when available.
 */
export function cravingPointsLastYear(
  state: RebuildState,
  asOfDate: string,
): CravingPointsPoint[] {
  const startBound = addDays(asOfDate, -364);
  const tz = profileTz(state);
  const byDate = new Map<
    string,
    { points: number; remaining: number; dropped: number }
  >();

  for (const c of state.cravings) {
    const date = dateKeyFromIso(c.at, tz);
    if (date < startBound || date > asOfDate) continue;
    const before = Number(c.intensityBefore);
    if (!Number.isFinite(before)) continue;
    const afterRaw = Number(c.intensityAfter);
    const hasAfter = Number.isFinite(afterRaw);
    const remaining = hasAfter ? afterRaw : before;
    const dropped = hasAfter ? Math.max(0, before - afterRaw) : 0;
    const prev = byDate.get(date) ?? { points: 0, remaining: 0, dropped: 0 };
    byDate.set(date, {
      points: prev.points + before,
      remaining: prev.remaining + remaining,
      dropped: prev.dropped + dropped,
    });
  }

  return [...byDate.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Rank mitigations by average intensity drop.
 * Empty until `PLAYBOOK_MIN_N` events have intensityAfter.
 * Does not invent drop from before-only events.
 */
export function cravingPlaybook(
  state: RebuildState,
  asOfDate: string,
  minN = PLAYBOOK_MIN_N,
): PlaybookRow[] {
  const startBound = addDays(asOfDate, -364);
  const tz = profileTz(state);
  const groups = new Map<string, { n: number; dropSum: number }>();
  let completed = 0;

  for (const c of state.cravings) {
    const date = dateKeyFromIso(c.at, tz);
    if (date < startBound || date > asOfDate) continue;
    const before = Number(c.intensityBefore);
    const after = Number(c.intensityAfter);
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    const labels = mitigationLabels(c);
    if (labels.length === 0) continue;
    completed += 1;
    const drop = Math.max(0, before - after);
    for (const label of labels) {
      const prev = groups.get(label) ?? { n: 0, dropSum: 0 };
      groups.set(label, { n: prev.n + 1, dropSum: prev.dropSum + drop });
    }
  }

  if (completed < minN) return [];

  return [...groups.entries()]
    .map(([outcome, g]) => ({
      outcome,
      n: g.n,
      avgDrop: g.dropSum / g.n,
    }))
    .sort((a, b) => b.avgDrop - a.avgDrop || b.n - a.n || a.outcome.localeCompare(b.outcome));
}

/** Time-of-day and day-of-week craving counts. Uses profile timezone. */
export function cravingHeadwindHours(
  state: RebuildState,
  asOfDate: string,
): HeadwindHours {
  const startBound = addDays(asOfDate, -364);
  const tz = profileTz(state);
  const partCounts = new Map<DaypartKey, { count: number; beforeSum: number }>();
  const dayCounts = new Array(7).fill(0).map(() => ({ count: 0, beforeSum: 0 }));
  let total = 0;

  for (const p of DAYPARTS) {
    partCounts.set(p.key, { count: 0, beforeSum: 0 });
  }

  for (const c of state.cravings) {
    const date = dateKeyFromIso(c.at, tz);
    if (date < startBound || date > asOfDate) continue;
    const before = Number(c.intensityBefore);
    if (!Number.isFinite(before)) continue;
    total += 1;
    const part = daypartForHour(hourInTz(c.at, tz));
    const pc = partCounts.get(part.key)!;
    pc.count += 1;
    pc.beforeSum += before;
    const wd = weekdayFromDateKey(date);
    dayCounts[wd].count += 1;
    dayCounts[wd].beforeSum += before;
  }

  const byDaypart: DaypartBucket[] = DAYPARTS.map((p) => {
    const g = partCounts.get(p.key)!;
    return {
      key: p.key,
      label: p.label,
      hoursLabel: p.hoursLabel,
      count: g.count,
      avgBefore: g.count ? g.beforeSum / g.count : 0,
    };
  });

  const byWeekday: WeekdayBucket[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: dayCounts[weekday].count,
    avgBefore: dayCounts[weekday].count
      ? dayCounts[weekday].beforeSum / dayCounts[weekday].count
      : 0,
  }));

  let peak: HeadwindHours["peak"];
  if (total > 0) {
    const ranked = [...byDaypart].sort(
      (a, b) => b.count - a.count || a.key.localeCompare(b.key),
    );
    const lead = ranked[0];
    const second = ranked[1];
    if (lead.count > 0 && (!second || lead.count > second.count)) {
      peak = {
        key: lead.key,
        label: lead.label.toLowerCase(),
        hoursLabel: lead.hoursLabel,
        count: lead.count,
      };
    }
  }

  return { total, byDaypart, byWeekday, peak };
}

export function lastFourWeeks(asOfDate: string): RhythmWeek[] {
  const weeks: RhythmWeek[] = [];
  let cursor = asOfDate;
  for (let i = 0; i < 4; i++) {
    const { start, end } = weekBounds(cursor);
    weeks.push({
      start,
      end,
      label: i === 0 ? "This week" : formatDisplayDate(start),
      isCurrent: i === 0,
    });
    cursor = addDays(start, -1);
  }
  return weeks.reverse();
}

function isActiveDay(state: RebuildState, date: string): boolean {
  if (state.mornings.some((m) => m.date === date)) return true;
  if (state.evenings.some((e) => e.date === date)) return true;
  if (state.supports.some((s) => s.date === date && s.completed)) return true;
  if ((state.dayProvisions ?? []).some((p) => p.date === date)) return true;
  const tz = profileTz(state);
  return state.cravings.some((c) => dateKeyFromIso(c.at, tz) === date);
}

/**
 * Last four Sunday–Saturday weeks of each enabled support vs weekly target.
 */
export function supportRhythmLastFourWeeks(
  state: RebuildState,
  asOfDate: string,
): SupportRhythm[] {
  if (!state.profile) return [];
  const weeks = lastFourWeeks(asOfDate);
  const windowStart = weeks[0]?.start;
  const tz = profileTz(state);
  const pointsByDate = new Map<string, number>();
  for (const c of state.cravings) {
    const date = dateKeyFromIso(c.at, tz);
    if (date < windowStart || date > asOfDate) continue;
    const before = Number(c.intensityBefore);
    if (!Number.isFinite(before)) continue;
    pointsByDate.set(date, (pointsByDate.get(date) ?? 0) + before);
  }

  return state.profile.supports
    .filter((s) => s.enabled)
    .map((s) => {
      const weekRows = weeks.map((w) => {
        const end = w.end < asOfDate ? w.end : asOfDate;
        const done = state.supports.filter(
          (c) =>
            c.supportType === s.type &&
            c.completed &&
            c.date >= w.start &&
            c.date <= end,
        ).length;
        return { start: w.start, done, target: s.weeklyTarget };
      });

      const withDays: number[] = [];
      const withoutDays: number[] = [];
      for (let d = windowStart; d <= asOfDate; d = addDays(d, 1)) {
        if (!isActiveDay(state, d)) continue;
        const hit = state.supports.some(
          (c) => c.supportType === s.type && c.completed && c.date === d,
        );
        const pts = pointsByDate.get(d) ?? 0;
        if (hit) withDays.push(pts);
        else withoutDays.push(pts);
      }

      const contrast =
        withDays.length >= 3 && withoutDays.length >= 3
          ? {
              withSupport: {
                days: withDays.length,
                avgPoints:
                  withDays.reduce((a, b) => a + b, 0) / withDays.length,
              },
              withoutSupport: {
                days: withoutDays.length,
                avgPoints:
                  withoutDays.reduce((a, b) => a + b, 0) / withoutDays.length,
              },
            }
          : undefined;

      return {
        type: s.type,
        label: s.label,
        target: s.weeklyTarget,
        weeks: weekRows,
        contrast,
      };
    });
}

export const CONDITION_METRICS: {
  key: ConditionMetric;
  label: string;
  color: string;
  axis: ConditionAxis;
}[] = [
  { key: "sleepHours", label: "Sleep", color: "#5a9a78", axis: "scale" },
  { key: "sleepQuality", label: "Quality", color: "#7fbf9a", axis: "scale" },
  { key: "mood", label: "Mood", color: "#d4844a", axis: "scale" },
  { key: "energy", label: "Energy", color: "#d4a24a", axis: "scale" },
  { key: "stress", label: "Stress", color: "#c97060", axis: "scale" },
];

/** @deprecated use CONDITION_METRICS */
export const TREND_METRICS = CONDITION_METRICS;
export type TrendMetric = ConditionMetric;

export function formatTrendDate(date: string): string {
  return formatDisplayDate(date);
}

export function daysBetween(from: string, to: string): number {
  return calendarDaysBetween(from, to);
}

/**
 * Legacy half-hour rounding for older clock-style sleep captures.
 * New morning check-ins use clampMorningScore (1–10).
 */
export function roundSleepHours(hours: number): number {
  if (!Number.isFinite(hours)) return 0;
  return Math.round(hours * 2) / 2;
}

export function formatDrop(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}
