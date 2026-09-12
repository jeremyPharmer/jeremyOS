import { addDays, formatDate, formatDisplayDate, newId, parseDate } from "./journey";
import { parseTaskGroup, optionalTaskGroup } from "./task-groups";
import type {
  DayProvision,
  RebuildState,
  TodoRecurrence,
  TodoRepeatEnds,
} from "./types";
import type { TaskGroup } from "./task-groups";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function appendCompletionDate(item: DayProvision, day: string): string[] {
  const prev = item.completionDates ?? [];
  if (prev.includes(day)) return prev;
  return [...prev, day].sort();
}

function removeCompletionDate(
  item: DayProvision,
  day: string | undefined,
): string[] | undefined {
  if (!day || !item.completionDates?.length) return item.completionDates;
  const next = item.completionDates.filter((d) => d !== day);
  return next.length ? next : undefined;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Single-letter labels for custom repeat-on row (Google Calendar style). */
export const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function isCalendarDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(parseDate(value).getTime());
}

/** Optional due time HH:mm (24h). Empty / invalid → undefined. */
export function parseTime(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  if (!TIME_RE.test(s)) return undefined;
  const [hh, mm] = s.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
  return s;
}

export function recurrenceOf(item: DayProvision): TodoRecurrence {
  return item.recurrence ?? { kind: "none" };
}

export function isRecurring(item: DayProvision): boolean {
  return recurrenceOf(item).kind !== "none";
}

function parseEnds(raw: unknown): TodoRepeatEnds | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const ends = raw as { type?: unknown; date?: unknown; count?: unknown };
  const type = String(ends.type ?? "never");
  if (type === "on") {
    const date = String(ends.date ?? "");
    if (!isCalendarDate(date)) {
      throw Object.assign(new Error("Ends-on needs a valid date"), { status: 400 });
    }
    return { type: "on", date };
  }
  if (type === "after") {
    const count = Number(ends.count);
    if (!Number.isInteger(count) || count < 1) {
      throw Object.assign(new Error("Ends after needs a whole number ≥ 1"), {
        status: 400,
      });
    }
    return { type: "after", count: Math.min(count, 999) };
  }
  return { type: "never" };
}

export function parseRecurrence(raw: unknown): TodoRecurrence {
  if (!raw || typeof raw !== "object") return { kind: "none" };
  const rec = raw as {
    kind?: unknown;
    weekdays?: unknown;
    n?: unknown;
    frequency?: unknown;
    interval?: unknown;
    monthlyOn?: unknown;
    ends?: unknown;
  };
  const kind = String(rec.kind ?? "none");
  if (kind === "daily") return { kind: "daily" };
  if (kind === "monthly_first") return { kind: "monthly_first" };
  if (kind === "every_n_days") {
    const n = Number(rec.n);
    if (!Number.isInteger(n) || n < 1) {
      throw Object.assign(new Error("Every N days needs a whole number ≥ 1"), {
        status: 400,
      });
    }
    return { kind: "every_n_days", n: Math.min(n, 365) };
  }
  if (kind === "weekly") {
    const weekdays = normalizeWeekdays(rec.weekdays);
    if (weekdays.length === 0) {
      throw Object.assign(new Error("Pick at least one weekday"), { status: 400 });
    }
    return { kind: "weekly", weekdays };
  }
  if (kind === "repeat") {
    const frequency = String(rec.frequency ?? "");
    if (
      frequency !== "day" &&
      frequency !== "week" &&
      frequency !== "month" &&
      frequency !== "year"
    ) {
      throw Object.assign(new Error("Pick a repeat frequency"), { status: 400 });
    }
    const interval = Number(rec.interval ?? 1);
    if (!Number.isInteger(interval) || interval < 1) {
      throw Object.assign(new Error("Repeat interval needs a whole number ≥ 1"), {
        status: 400,
      });
    }
    const ends = parseEnds(rec.ends) ?? { type: "never" as const };
    if (frequency === "week") {
      const weekdays = normalizeWeekdays(rec.weekdays);
      if (weekdays.length === 0) {
        throw Object.assign(new Error("Pick at least one weekday"), { status: 400 });
      }
      return {
        kind: "repeat",
        frequency: "week",
        interval: Math.min(interval, 99),
        weekdays,
        ends,
      };
    }
    if (frequency === "month") {
      const monthlyOn =
        rec.monthlyOn === "nth_weekday" ? "nth_weekday" : "day";
      return {
        kind: "repeat",
        frequency: "month",
        interval: Math.min(interval, 99),
        monthlyOn,
        ends,
      };
    }
    return {
      kind: "repeat",
      frequency,
      interval: Math.min(interval, 99),
      ends,
    };
  }
  return { kind: "none" };
}

export function normalizeWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  for (const v of raw) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 6) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

function addMonthsClamped(date: string, months: number): string {
  const d = parseDate(date);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return formatDate(target);
}

function addYearsClamped(date: string, years: number): string {
  return addMonthsClamped(date, years * 12);
}

/** Nth weekday in a month (1–4 or 5 = last). */
function dateOnNthWeekday(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
): string {
  if (nth >= 5) {
    const last = new Date(year, monthIndex + 1, 0);
    const back = (last.getDay() - weekday + 7) % 7;
    last.setDate(last.getDate() - back);
    return formatDate(last);
  }
  const first = new Date(year, monthIndex, 1);
  const forward = (weekday - first.getDay() + 7) % 7;
  first.setDate(1 + forward + (nth - 1) * 7);
  return formatDate(first);
}

function nthWeekdayOfDate(date: string): { weekday: number; nth: number } {
  const d = parseDate(date);
  const weekday = d.getDay();
  const nth = Math.ceil(d.getDate() / 7);
  return { weekday, nth: Math.min(nth, 5) };
}

function nextRepeatDue(completedOn: string, recurrence: Extract<TodoRecurrence, { kind: "repeat" }>): string {
  const { frequency, interval } = recurrence;
  if (frequency === "day") return addDays(completedOn, interval);
  if (frequency === "week") {
    const weekdays = normalizeWeekdays(recurrence.weekdays ?? []);
    const from = parseDate(completedOn);
    const fromDay = from.getDay();
    const later = weekdays.filter((d) => d > fromDay);
    if (later.length > 0) {
      return addDays(completedOn, later[0] - fromDay);
    }
    const first = weekdays[0] ?? fromDay;
    const daysToFirst = ((7 - fromDay + first) % 7) || 7;
    return addDays(completedOn, daysToFirst + (interval - 1) * 7);
  }
  if (frequency === "month") {
    if (recurrence.monthlyOn === "nth_weekday") {
      const { weekday, nth } = nthWeekdayOfDate(completedOn);
      const d = parseDate(completedOn);
      const target = new Date(d.getFullYear(), d.getMonth() + interval, 1);
      return dateOnNthWeekday(
        target.getFullYear(),
        target.getMonth(),
        weekday,
        nth,
      );
    }
    return addMonthsClamped(completedOn, interval);
  }
  // year
  return addYearsClamped(completedOn, interval);
}

/** First due date for a new item (today if it matches the cadence). */
export function firstDueDate(today: string, recurrence: TodoRecurrence): string {
  if (recurrence.kind === "weekly") {
    return nextMatchingWeekday(today, recurrence.weekdays, true);
  }
  if (recurrence.kind === "monthly_first") {
    return nextFirstOfMonth(today, true);
  }
  if (recurrence.kind === "repeat") {
    if (recurrence.frequency === "week") {
      return nextMatchingWeekday(today, recurrence.weekdays ?? [], true);
    }
    return today;
  }
  return today;
}

/** Next due after completing an occurrence on `completedOn`. */
export function nextDueDate(completedOn: string, recurrence: TodoRecurrence): string {
  if (recurrence.kind === "daily") return addDays(completedOn, 1);
  if (recurrence.kind === "every_n_days") {
    return addDays(completedOn, recurrence.n);
  }
  if (recurrence.kind === "weekly") {
    return nextMatchingWeekday(addDays(completedOn, 1), recurrence.weekdays, true);
  }
  if (recurrence.kind === "monthly_first") {
    return nextFirstOfMonth(addDays(completedOn, 1), true);
  }
  if (recurrence.kind === "repeat") {
    return nextRepeatDue(completedOn, recurrence);
  }
  return completedOn;
}

export function nextMatchingWeekday(
  fromInclusive: string,
  weekdays: number[],
  inclusive: boolean,
): string {
  const wanted = normalizeWeekdays(weekdays);
  if (wanted.length === 0) return fromInclusive;
  const start = inclusive ? fromInclusive : addDays(fromInclusive, 1);
  for (let i = 0; i < 8; i++) {
    const d = addDays(start, i);
    if (wanted.includes(parseDate(d).getDay())) return d;
  }
  return addDays(start, 7);
}

export function nextFirstOfMonth(fromInclusive: string, inclusive: boolean): string {
  const start = inclusive ? fromInclusive : addDays(fromInclusive, 1);
  const d = parseDate(start);
  if (d.getDate() === 1) return start;
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

export function isOpenOn(item: DayProvision, date: string): boolean {
  if (item.completed) return false;
  if (item.undated) return true;
  return item.date === date;
}

export function openTodosOn(items: DayProvision[], date: string): DayProvision[] {
  return items.filter((item) => isOpenOn(item, date));
}

/** One-off done today, or recurring completed today (date already advanced). */
export function completedTodosForUndo(
  items: DayProvision[],
  today: string,
): DayProvision[] {
  return items.filter((item) => {
    if (item.lastCompletedOn === today && isRecurring(item)) return true;
    return item.completed && (item.date === today || item.undated);
  });
}

export function upcomingTodos(items: DayProvision[], today: string): DayProvision[] {
  return items
    .filter((item) => !item.completed && !item.undated && item.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

export function doneOneOffTodos(items: DayProvision[]): DayProvision[] {
  return items
    .filter((item) => item.completed && !isRecurring(item))
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}

/**
 * Incomplete items with a due date before today move to today.
 * Undated, future (snoozed), and completed one-offs stay put.
 */
export function autoRollTodos(items: DayProvision[], today: string): DayProvision[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.completed || item.undated) return item;
    if (item.date < today) {
      changed = true;
      return { ...item, date: today };
    }
    return item;
  });
  return changed ? next : items;
}

export function ensureTodosRolled(state: RebuildState, today: string): RebuildState {
  const items = state.dayProvisions ?? [];
  const rolled = autoRollTodos(items, today);
  if (rolled === items) return state;
  return { ...state, dayProvisions: rolled };
}

/**
 * Snooze a one-off until `until`.
 * Recurring: treat as “not done today” — advance to the next natural due
 * (same schedule as complete), without marking the occurrence completed.
 */
export function snoozeUntil(
  item: DayProvision,
  until: string,
  today: string,
): DayProvision {
  if (item.completed) {
    throw Object.assign(new Error("Can’t snooze a finished item"), { status: 400 });
  }
  if (!isCalendarDate(until)) {
    throw Object.assign(new Error("Pick a date to snooze until"), { status: 400 });
  }
  if (isRecurring(item)) {
    const nextDate = nextDueDate(today, recurrenceOf(item));
    return {
      ...item,
      date: nextDate,
      undated: false,
      completed: false,
    };
  }
  return { ...item, date: until, undated: false, completed: false };
}

function seriesShouldEnd(
  recurrence: TodoRecurrence,
  nextDate: string,
  nextCount: number,
): boolean {
  if (recurrence.kind !== "repeat" || !recurrence.ends) return false;
  if (recurrence.ends.type === "after" && nextCount >= recurrence.ends.count) {
    return true;
  }
  if (recurrence.ends.type === "on" && nextDate > recurrence.ends.date) {
    return true;
  }
  return false;
}

export function completeTodo(
  item: DayProvision,
  today: string,
  nowIso: string,
): DayProvision {
  const rec = recurrenceOf(item);
  const completionDates = item.trackOverTime
    ? appendCompletionDate(item, today)
    : item.completionDates;
  if (rec.kind === "none") {
    return {
      ...item,
      completed: true,
      completedAt: nowIso,
      lastCompletedOn: today,
      ...(completionDates ? { completionDates } : {}),
    };
  }
  const nextCount = (item.repeatCount ?? 0) + 1;
  const nextDate = nextDueDate(today, rec);
  if (seriesShouldEnd(rec, nextDate, nextCount)) {
    return {
      ...item,
      completed: true,
      completedAt: nowIso,
      lastCompletedOn: today,
      repeatCount: nextCount,
      ...(completionDates ? { completionDates } : {}),
    };
  }
  return {
    ...item,
    completed: false,
    completedAt: nowIso,
    lastCompletedOn: today,
    date: nextDate,
    repeatCount: nextCount,
    ...(completionDates ? { completionDates } : {}),
  };
}

export function undoCompleteTodo(item: DayProvision): DayProvision {
  const completionDates = item.trackOverTime
    ? removeCompletionDate(item, item.lastCompletedOn)
    : item.completionDates;
  if (isRecurring(item) && item.lastCompletedOn) {
    return {
      ...item,
      completed: false,
      date: item.lastCompletedOn,
      lastCompletedOn: undefined,
      completedAt: undefined,
      repeatCount: Math.max(0, (item.repeatCount ?? 1) - 1) || undefined,
      completionDates,
    };
  }
  return {
    ...item,
    completed: false,
    lastCompletedOn: undefined,
    completedAt: undefined,
    completionDates,
  };
}

function formatEndsSuffix(ends?: TodoRepeatEnds): string {
  if (!ends || ends.type === "never") return "";
  if (ends.type === "on") return ` · until ${formatDisplayDate(ends.date)}`;
  return ` · ${ends.count}×`;
}

function ordinalDay(n: number): string {
  const mod100 = n % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

function formatMonthlyAnchor(
  anchorDate: string,
  monthlyOn: "day" | "nth_weekday",
): string {
  const d = parseDate(anchorDate);
  if (monthlyOn === "nth_weekday") {
    const nth = Math.min(Math.ceil(d.getDate() / 7), 5);
    return `${ordinalDay(nth)} ${WEEKDAY_LABELS[d.getDay()]}`;
  }
  if (d.getDate() === 1) return "1st of month";
  return `${ordinalDay(d.getDate())} of month`;
}

export function formatRecurrence(
  recurrence: TodoRecurrence,
  anchorDate?: string,
): string {
  if (recurrence.kind === "daily") return "Daily";
  if (recurrence.kind === "monthly_first") return "1st of the month";
  if (recurrence.kind === "every_n_days") {
    return recurrence.n === 1 ? "Every day" : `Every ${recurrence.n} days`;
  }
  if (recurrence.kind === "weekly") {
    const labels = recurrence.weekdays.map((d) => WEEKDAY_LABELS[d]);
    if (labels.length === 7) return "Every day";
    return labels.join(" · ");
  }
  if (recurrence.kind === "repeat") {
    const ends = formatEndsSuffix(recurrence.ends);
    const n = recurrence.interval;
    const unit =
      recurrence.frequency === "day"
        ? n === 1
          ? "day"
          : "days"
        : recurrence.frequency === "week"
          ? n === 1
            ? "week"
            : "weeks"
          : recurrence.frequency === "month"
            ? n === 1
              ? "month"
              : "months"
            : n === 1
              ? "year"
              : "years";
    let base = n === 1 && recurrence.frequency === "day" ? "Daily" : `Every ${n} ${unit}`;
    if (recurrence.frequency === "day" && n === 1) base = "Daily";
    if (recurrence.frequency === "week") {
      const labels = (recurrence.weekdays ?? []).map((d) => WEEKDAY_LABELS[d]);
      if (labels.length === 7 && n === 1) return "Daily" + ends;
      if (n === 1) return (labels.join(" · ") || "Weekly") + ends;
      return `${base} · ${labels.join(" · ")}` + ends;
    }
    if (recurrence.frequency === "month") {
      if (anchorDate) {
        const anchor = formatMonthlyAnchor(anchorDate, recurrence.monthlyOn ?? "day");
        if (n === 1) return anchor + ends;
        return `Every ${n} mo · ${anchor}` + ends;
      }
      if (n === 1 && recurrence.monthlyOn !== "nth_weekday") return "Monthly" + ends;
      if (recurrence.monthlyOn === "nth_weekday") {
        return (n === 1 ? "Monthly weekday" : `${base} · weekday`) + ends;
      }
      return base + ends;
    }
    if (recurrence.frequency === "year") {
      return (n === 1 ? "Yearly" : base) + ends;
    }
    return base + ends;
  }
  return "";
}

export type TodoActionInput = {
  action?: string;
  id?: string;
  label?: string;
  date?: string;
  time?: string | null;
  until?: string;
  recurrence?: unknown;
  group?: unknown;
  undated?: boolean;
  trackOverTime?: boolean;
};

export function applyTodoAction(
  state: RebuildState,
  body: TodoActionInput,
  today: string,
  nowIso: string,
): RebuildState {
  const action = String(body.action ?? "add");
  const next = ensureTodosRolled(state, today);
  const items = [...(next.dayProvisions ?? [])];

  if (action === "add") {
    const label = String(body.label ?? "").trim();
    if (!label) {
      throw Object.assign(new Error("Item label is required"), { status: 400 });
    }
    const group = parseTaskGroup(body.group);
    const recurrence = parseRecurrence(body.recurrence);
    const undated = body.undated === true;
    const requested = String(body.date ?? "").trim();
    let date = today;
    if (!undated) {
      date = isCalendarDate(requested)
        ? requested
        : firstDueDate(today, recurrence);
      if (date < today) date = today;
    }
    const time = undated ? undefined : parseTime(body.time);
    const trackOverTime =
      !undated && recurrence.kind !== "none" && body.trackOverTime === true;
    const row: DayProvision = {
      id: newId("todo"),
      date,
      label,
      completed: false,
      recurrence,
      group,
      ...(undated ? { undated: true } : {}),
      ...(time ? { time } : {}),
      ...(trackOverTime
        ? { trackOverTime: true, createdAt: nowIso, completionDates: [] }
        : {}),
    };
    return { ...next, dayProvisions: [...items, row] };
  }

  const id = String(body.id ?? "");
  const index = items.findIndex((p) => p.id === id);
  if (action !== "add" && index < 0) {
    throw Object.assign(new Error("Item not found"), { status: 404 });
  }
  const current = items[index];

  if (action === "complete") {
    items[index] = completeTodo(current, today, nowIso);
    return { ...next, dayProvisions: items };
  }

  if (action === "undo") {
    items[index] = undoCompleteTodo(current);
    return { ...next, dayProvisions: items };
  }

  if (action === "edit") {
    const label = String(body.label ?? current.label).trim();
    if (!label) {
      throw Object.assign(new Error("Item label is required"), { status: 400 });
    }
    const recurrence =
      body.recurrence !== undefined
        ? parseRecurrence(body.recurrence)
        : recurrenceOf(current);
    const undated =
      body.undated !== undefined ? body.undated === true : Boolean(current.undated);
    const requested = String(body.date ?? "").trim();
    let date = current.date;
    if (!undated) {
      date = isCalendarDate(requested) ? requested : current.date || today;
      if (date < today) date = today;
    }
    const time = undated
      ? undefined
      : body.time !== undefined
        ? parseTime(body.time)
        : current.time;
    const group: TaskGroup =
      body.group !== undefined
        ? parseTaskGroup(body.group)
        : optionalTaskGroup(current.group) ??
          (() => {
            throw Object.assign(new Error("Pick a group"), { status: 400 });
          })();
    const trackOverTime =
      body.trackOverTime !== undefined
        ? body.trackOverTime === true && !undated && recurrence.kind !== "none"
        : Boolean(current.trackOverTime) &&
          !undated &&
          recurrence.kind !== "none";
    items[index] = {
      ...current,
      label,
      recurrence,
      date,
      time,
      group,
      undated: undated || undefined,
      completed: recurrence.kind !== "none" ? false : current.completed,
      trackOverTime: trackOverTime || undefined,
      createdAt: trackOverTime
        ? current.createdAt ?? nowIso
        : current.createdAt,
      completionDates: trackOverTime
        ? current.completionDates ?? []
        : current.completionDates,
    };
    if (!undated) delete items[index].undated;
    if (!trackOverTime) {
      delete items[index].trackOverTime;
    }
    return { ...next, dayProvisions: items };
  }

  if (action === "remove" || action === "delete") {
    return { ...next, dayProvisions: items.filter((p) => p.id !== id) };
  }

  if (action === "snooze") {
    const untilRaw = String(body.until ?? "").trim();
    const until = untilRaw === "tomorrow" ? addDays(today, 1) : untilRaw;
    if (!isCalendarDate(until) || until <= today) {
      throw Object.assign(new Error("Snooze until a future date"), { status: 400 });
    }
    items[index] = snoozeUntil(current, until, today);
    return { ...next, dayProvisions: items };
  }

  throw Object.assign(new Error("Unknown action"), { status: 400 });
}
