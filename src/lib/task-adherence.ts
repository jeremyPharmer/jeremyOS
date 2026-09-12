import { addDays } from "./journey";
import {
  firstDueDate,
  isRecurring,
  nextDueDate,
  recurrenceOf,
} from "./todos";
import type { DayProvision, RebuildState, TodoRecurrence } from "./types";

export type TaskAdherence = {
  id: string;
  label: string;
  /** Distinct completion days since tracking started. */
  completed: number;
  /** Scheduled occurrences from created day through today (inclusive). */
  expected: number;
  /** 0–100 rounded; null when nothing was scheduled yet. */
  percent: number | null;
  createdOn: string;
};

function dateOnly(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

/** Calendar days that match this recurrence from `from` through `to` (inclusive). */
export function scheduledOccurrenceDates(
  from: string,
  to: string,
  recurrence: TodoRecurrence,
): string[] {
  if (recurrence.kind === "none" || from > to) return [];
  const dates: string[] = [];
  let cursor = firstDueDate(from, recurrence);
  if (cursor < from) {
    cursor = nextDueDate(cursor, recurrence);
  }
  let guard = 0;
  while (cursor <= to && guard++ < 2500) {
    if (cursor >= from) dates.push(cursor);
    const next = nextDueDate(cursor, recurrence);
    if (next <= cursor) break;
    cursor = next;
  }
  return dates;
}

export function trackingStartDate(item: DayProvision, today: string): string {
  if (item.createdAt) return dateOnly(item.createdAt);
  if (item.completionDates?.length) {
    return [...item.completionDates].sort()[0]!;
  }
  return item.date <= today ? item.date : today;
}

/**
 * Adherence for a track-over-time task: completions ÷ scheduled occurrences
 * from created day through today (RB-032).
 */
export function taskAdherence(
  item: DayProvision,
  today: string,
): TaskAdherence | null {
  if (!item.trackOverTime || !isRecurring(item)) return null;
  const createdOn = trackingStartDate(item, today);
  const expectedDates = scheduledOccurrenceDates(
    createdOn,
    today,
    recurrenceOf(item),
  );
  const expected = expectedDates.length;
  const completedSet = new Set(
    (item.completionDates ?? []).filter((d) => d >= createdOn && d <= today),
  );
  if (item.lastCompletedOn && item.lastCompletedOn <= today) {
    completedSet.add(item.lastCompletedOn);
  }
  const done = completedSet.size;
  const percent =
    expected === 0 ? null : Math.min(100, Math.round((100 * done) / expected));
  return {
    id: item.id,
    label: item.label,
    completed: done,
    expected,
    percent,
    createdOn,
  };
}

export function trackedTaskAdherenceList(
  state: RebuildState,
  today: string,
): TaskAdherence[] {
  const items = state.dayProvisions ?? [];
  return items
    .map((item) => taskAdherence(item, today))
    .filter((row): row is TaskAdherence => row != null)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Keep addDays available for future range helpers. */
export function daysSinceCreated(createdOn: string, today: string): number {
  if (createdOn > today) return 0;
  let n = 0;
  let d = createdOn;
  while (d <= today) {
    n += 1;
    d = addDays(d, 1);
    if (n > 5000) break;
  }
  return n;
}
