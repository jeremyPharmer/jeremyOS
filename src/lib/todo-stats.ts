import {
  TASK_GROUPS,
  TASK_GROUP_LABELS,
  type TaskGroup,
} from "./task-groups";
import type { RebuildState, TodoEvent } from "./types";

export type MonthlyCompletePoint = {
  /** YYYY-MM */
  month: string;
  /** Display e.g. Sep */
  label: string;
  count: number;
};

export type GroupCompleteStat = {
  group: TaskGroup;
  label: string;
  completed: number;
  /** Share of all completed events (0–100); null if none. */
  percent: number | null;
};

export type TodoHistoryRow = {
  id: string;
  at: string;
  date: string;
  label: string;
  group?: TaskGroup;
  action: "complete" | "snooze" | "undo";
};

export type TodoAnalytics = {
  completes: number;
  snoozes: number;
  undos: number;
  /** snoozes ÷ (completes + snoozes); null when no actions yet. */
  snoozePercent: number | null;
  monthlyCompletes: MonthlyCompletePoint[];
  byGroup: GroupCompleteStat[];
  history: TodoHistoryRow[];
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function eventsOf(state: RebuildState): TodoEvent[] {
  return state.todoEvents ?? [];
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  if (!Number.isFinite(m) || m < 1 || m > 12) return ym;
  return MONTH_SHORT[m - 1]!;
}

/** Last `count` calendar months ending at `today`'s month (inclusive). */
export function recentMonthKeys(today: string, count = 6): string[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return [];
  const keys: string[] = [];
  let yy = y;
  let mm = m;
  for (let i = 0; i < count; i++) {
    keys.unshift(`${yy}-${String(mm).padStart(2, "0")}`);
    mm -= 1;
    if (mm < 1) {
      mm = 12;
      yy -= 1;
    }
  }
  return keys;
}

export function todoAnalytics(
  state: RebuildState,
  today: string,
  opts?: { historyLimit?: number; monthCount?: number },
): TodoAnalytics {
  const historyLimit = opts?.historyLimit ?? 24;
  const monthCount = opts?.monthCount ?? 6;
  const events = eventsOf(state);

  let completes = 0;
  let snoozes = 0;
  let undos = 0;
  const byGroupCount: Record<TaskGroup, number> = {
    real_estate: 0,
    family: 0,
    home: 0,
    work: 0,
  };
  const monthMap = new Map<string, number>();

  for (const e of events) {
    if (e.action === "complete") {
      completes += 1;
      const mk = monthKey(e.date);
      monthMap.set(mk, (monthMap.get(mk) ?? 0) + 1);
      if (e.group) byGroupCount[e.group] += 1;
    } else if (e.action === "snooze") {
      snoozes += 1;
    } else if (e.action === "undo") {
      undos += 1;
    }
  }

  const decided = completes + snoozes;
  const snoozePercent =
    decided === 0 ? null : Math.round((100 * snoozes) / decided);

  const monthlyCompletes = recentMonthKeys(today, monthCount).map((month) => ({
    month,
    label: monthLabel(month),
    count: monthMap.get(month) ?? 0,
  }));

  const byGroup: GroupCompleteStat[] = TASK_GROUPS.map((group) => {
    const completed = byGroupCount[group];
    return {
      group,
      label: TASK_GROUP_LABELS[group],
      completed,
      percent:
        completes === 0
          ? null
          : Math.round((100 * completed) / completes),
    };
  });

  const history: TodoHistoryRow[] = [...events]
    .reverse()
    .slice(0, historyLimit)
    .map((e) => ({
      id: e.id,
      at: e.at,
      date: e.date,
      label: e.label,
      group: e.group,
      action: e.action,
    }));

  return {
    completes,
    snoozes,
    undos,
    snoozePercent,
    monthlyCompletes,
    byGroup,
    history,
  };
}
