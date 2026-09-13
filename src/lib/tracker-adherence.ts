import {
  datesInRange,
  gymWorkoutsInRange,
  isSupportDoneToday,
} from "./journey";
import { isMedicationTodoLabel } from "./todos";
import type { RebuildState, SupportConfig, SupportType } from "./types";

export type TrackerAdherence = {
  type: SupportType;
  label: string;
  weeklyTarget: number;
  /** Earliest completed day, or null if never logged. */
  firstLogDate: string | null;
  /** Distinct days with a completion in [firstLogDate, today]. */
  completed: number;
  /**
   * Expected completions from first log through today, from times/week:
   * round(daysElapsed × weeklyTarget / 7). Daily (7/wk) ≈ days elapsed.
   */
  expected: number;
  /** Calendar days from first log through today (inclusive). */
  daysElapsed: number;
  /** 0–100 rounded; null when there is no first log. */
  percent: number | null;
  doneToday: boolean;
};

/** Distinct completion dates for one long-term tracker through `today`. */
export function trackerCompletionDates(
  state: RebuildState,
  type: SupportType,
  today: string,
): string[] {
  const dates = new Set<string>();
  for (const s of state.supports ?? []) {
    if (s.supportType === type && s.completed && s.date <= today) {
      dates.add(s.date);
    }
  }
  if (type === "medication") {
    for (const item of state.dayProvisions ?? []) {
      if (!isMedicationTodoLabel(item.label)) continue;
      for (const d of item.completionDates ?? []) {
        if (d <= today) dates.add(d);
      }
      if (item.lastCompletedOn && item.lastCompletedOn <= today) {
        dates.add(item.lastCompletedOn);
      }
    }
  }
  if (type === "gym") {
    // Align with weeklySupportProgress: non-run workouts count as gym days.
    for (const w of state.workouts ?? []) {
      if (w.date > today) continue;
      const wType =
        w.type ??
        (w.category === "run"
          ? "run"
          : w.liftType === "hiit"
            ? "hiit"
            : w.liftType === "stretch"
              ? "stretch"
              : "lift");
      if (wType !== "run") dates.add(w.date);
    }
  }
  return [...dates].sort();
}

function expectedFromFrequency(
  daysElapsed: number,
  weeklyTarget: number,
): number {
  if (daysElapsed <= 0 || weeklyTarget <= 0) return 0;
  return Math.max(1, Math.round((daysElapsed * weeklyTarget) / 7));
}

/**
 * Adherence for one enabled long-term tracker since first log (RB-033).
 */
export function trackerAdherence(
  state: RebuildState,
  config: SupportConfig,
  today: string,
): TrackerAdherence {
  const type = config.type;
  const label = config.label?.trim() || type;
  const weeklyTarget = Math.max(0, Number(config.weeklyTarget) || 0);

  const completedDates = trackerCompletionDates(state, type, today);
  const firstLogDate = completedDates[0] ?? null;
  const doneToday =
    isSupportDoneToday(state, today, type) ||
    completedDates.includes(today) ||
    (type === "gym" && gymWorkoutsInRange(state, today, today) > 0);

  if (!firstLogDate) {
    return {
      type,
      label,
      weeklyTarget,
      firstLogDate: null,
      completed: 0,
      expected: 0,
      daysElapsed: 0,
      percent: null,
      doneToday,
    };
  }

  const window = datesInRange(firstLogDate, today);
  const coveredSet = new Set(completedDates);
  const completed = window.filter((d) => coveredSet.has(d)).length;
  const daysElapsed = window.length;
  const expected = expectedFromFrequency(daysElapsed, weeklyTarget);
  const percent =
    expected === 0
      ? null
      : Math.min(100, Math.round((100 * completed) / expected));

  return {
    type,
    label,
    weeklyTarget,
    firstLogDate,
    completed,
    expected,
    daysElapsed,
    percent,
    doneToday,
  };
}

/** Adherence rows for every enabled long-term tracker on the profile. */
export function longTermTrackerAdherenceList(
  state: RebuildState,
  today: string,
): TrackerAdherence[] {
  const configs = state.profile?.supports?.filter((s) => s.enabled) ?? [];
  return configs.map((c) => trackerAdherence(state, c, today));
}
