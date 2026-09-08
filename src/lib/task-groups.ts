import type { DayProvision } from "./types";
import { parseDate } from "./journey";

/** Fixed life-area groups (RB-026). */
export type TaskGroup = "real_estate" | "family" | "home" | "work";

export const TASK_GROUPS: readonly TaskGroup[] = [
  "real_estate",
  "family",
  "home",
  "work",
] as const;

export const TASK_GROUP_LABELS: Record<TaskGroup, string> = {
  real_estate: "Real estate",
  family: "Family",
  home: "Home",
  work: "Work",
};

/** Compact labels for the 4-across group picker (RB-026). */
export const TASK_GROUP_SHORT_LABELS: Record<TaskGroup, string> = {
  real_estate: "RE",
  family: "Family",
  home: "Home",
  work: "Work",
};

/** Left-bar colors (RB-026). */
export const TASK_GROUP_COLORS: Record<TaskGroup, string> = {
  real_estate: "#c45c4a",
  family: "#d4a24a",
  home: "#4a7ab5",
  work: "#5a9a78",
};

/** Profile map: default group per calendar feed. */
export type CalendarFeedGroups = {
  personal?: TaskGroup;
  work?: TaskGroup;
  google?: TaskGroup;
  /** Parallel to `extraIcalUrls` */
  extra?: (TaskGroup | undefined)[];
};

export function isTaskGroup(value: unknown): value is TaskGroup {
  return (
    value === "real_estate" ||
    value === "family" ||
    value === "home" ||
    value === "work"
  );
}

export function parseTaskGroup(raw: unknown): TaskGroup {
  if (!isTaskGroup(raw)) {
    throw Object.assign(new Error("Pick a group"), { status: 400 });
  }
  return raw;
}

export function optionalTaskGroup(raw: unknown): TaskGroup | undefined {
  return isTaskGroup(raw) ? raw : undefined;
}

/** Calendar chip: M/D, no leading zeros (e.g. 9/7). */
export function formatMonthDay(date: string): string {
  const d = parseDate(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Completed done date: M/D/YY. */
export function formatMonthDayYear(isoOrDate: string): string {
  const raw = isoOrDate.includes("T") ? isoOrDate.slice(0, 10) : isoOrDate;
  const d = parseDate(raw);
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getMonth() + 1}/${d.getDate()}/${yy}`;
}

export function isUndatedTodo(item: DayProvision): boolean {
  return Boolean(item.undated);
}

export function sortTodosByDueDate(items: DayProvision[]): DayProvision[] {
  return [...items].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (da !== db) return da.localeCompare(db);
    return a.label.localeCompare(b.label);
  });
}

export type GroupedOpenTodos = {
  group: TaskGroup;
  dated: DayProvision[];
  undated: DayProvision[];
};

export type GroupedCompletedTodos = {
  group: TaskGroup;
  items: DayProvision[];
};

function bucketsFor(
  items: DayProvision[],
  include: (item: DayProvision) => boolean,
): Map<TaskGroup | "ungrouped", DayProvision[]> {
  const map = new Map<TaskGroup | "ungrouped", DayProvision[]>();
  for (const item of items) {
    if (!include(item)) continue;
    const key = item.group ?? "ungrouped";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

/** Open todos bucketed by group. Hides empty groups. Ungrouped listed last as Home until assigned. */
export function groupOpenTodos(items: DayProvision[]): GroupedOpenTodos[] {
  const map = bucketsFor(items, (item) => !item.completed);
  const out: GroupedOpenTodos[] = [];
  for (const group of TASK_GROUPS) {
    const inGroup = map.get(group) ?? [];
    if (inGroup.length === 0) continue;
    out.push({
      group,
      dated: sortTodosByDueDate(inGroup.filter((i) => !isUndatedTodo(i))),
      undated: inGroup
        .filter((i) => isUndatedTodo(i))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  }
  const ungrouped = map.get("ungrouped") ?? [];
  if (ungrouped.length > 0) {
    const existing = out.find((g) => g.group === "home");
    const dated = sortTodosByDueDate(ungrouped.filter((i) => !isUndatedTodo(i)));
    const undated = ungrouped
      .filter((i) => isUndatedTodo(i))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (existing) {
      existing.dated = sortTodosByDueDate([...existing.dated, ...dated]);
      existing.undated = [...existing.undated, ...undated].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    } else {
      out.push({ group: "home", dated, undated });
      out.sort(
        (a, b) => TASK_GROUPS.indexOf(a.group) - TASK_GROUPS.indexOf(b.group),
      );
    }
  }
  return out;
}

/** Completed todos by group (one-offs forever + recurring with lastCompletedOn). */
export function groupCompletedTodos(
  items: DayProvision[],
): GroupedCompletedTodos[] {
  const map = bucketsFor(
    items,
    (item) => item.completed || Boolean(item.lastCompletedOn),
  );
  const out: GroupedCompletedTodos[] = [];
  for (const group of TASK_GROUPS) {
    const inGroup = (map.get(group) ?? []).sort((a, b) => {
      const ta = a.completedAt || a.lastCompletedOn || "";
      const tb = b.completedAt || b.lastCompletedOn || "";
      return tb.localeCompare(ta);
    });
    if (inGroup.length === 0) continue;
    out.push({ group, items: inGroup });
  }
  const ungrouped = map.get("ungrouped") ?? [];
  if (ungrouped.length > 0) {
    const sorted = ungrouped.sort((a, b) => {
      const ta = a.completedAt || a.lastCompletedOn || "";
      const tb = b.completedAt || b.lastCompletedOn || "";
      return tb.localeCompare(ta);
    });
    const existing = out.find((g) => g.group === "home");
    if (existing) {
      existing.items = [...existing.items, ...sorted].sort((a, b) => {
        const ta = a.completedAt || a.lastCompletedOn || "";
        const tb = b.completedAt || b.lastCompletedOn || "";
        return tb.localeCompare(ta);
      });
    } else {
      out.push({ group: "home", items: sorted });
      out.sort(
        (a, b) => TASK_GROUPS.indexOf(a.group) - TASK_GROUPS.indexOf(b.group),
      );
    }
  }
  return out;
}

export function doneDateLabel(item: DayProvision): string {
  if (item.completedAt) return formatMonthDayYear(item.completedAt);
  if (item.lastCompletedOn) return formatMonthDayYear(item.lastCompletedOn);
  if (item.date) return formatMonthDayYear(item.date);
  return "";
}

/** Resolve display group for a calendar event. */
export function resolveEventGroup(opts: {
  eventId: string;
  source: string;
  /** Index into extra feeds when source is extra — from event id if encoded */
  extraIndex?: number;
  customGroup?: TaskGroup;
  overrides: Record<string, TaskGroup>;
  feedGroups?: CalendarFeedGroups;
}): TaskGroup | undefined {
  const fromOverride = optionalTaskGroup(opts.overrides[opts.eventId]);
  if (fromOverride) return fromOverride;
  if (opts.customGroup) return opts.customGroup;
  const feeds = opts.feedGroups;
  if (!feeds) return undefined;
  if (opts.source === "personal") return feeds.personal;
  if (opts.source === "work") return feeds.google ?? feeds.work;
  if (opts.source === "extra") {
    const idx = opts.extraIndex ?? 0;
    return feeds.extra?.[idx];
  }
  return undefined;
}
