import { datesInRange, isSupportDoneToday } from "./journey";
import { isMedicationTodoLabel } from "./todos";
import type { RebuildState, SupportType } from "./types";

const MEDICATION: SupportType = "medication";

export type MedicationAdherence = {
  /** Earliest completed medication day, or null if never logged. */
  firstDoseDate: string | null;
  /** Distinct days with a completed medication log in [firstDoseDate, today]. */
  daysCovered: number;
  /** Calendar days from first dose through today (inclusive). */
  daysElapsed: number;
  /** 0–100 rounded; null when there is no first dose. */
  percent: number | null;
  takenToday: boolean;
  /** Profile has an enabled medication support. */
  configured: boolean;
  label: string;
};

/** Support taps plus Medication todo completions (same habit, two surfaces). */
export function medicationCompletionDates(
  state: RebuildState,
  today: string,
): string[] {
  const dates = new Set<string>();
  for (const s of state.supports ?? []) {
    if (s.supportType === MEDICATION && s.completed && s.date <= today) {
      dates.add(s.date);
    }
  }
  for (const item of state.dayProvisions ?? []) {
    if (!isMedicationTodoLabel(item.label)) continue;
    for (const d of item.completionDates ?? []) {
      if (d <= today) dates.add(d);
    }
    if (item.lastCompletedOn && item.lastCompletedOn <= today) {
      dates.add(item.lastCompletedOn);
    }
  }
  return [...dates].sort();
}

/**
 * % of calendar days covered by medication logs (Journey support and/or
 * Medication todo) from the first logged dose through today. RB-031.
 */
export function medicationAdherence(
  state: RebuildState,
  today: string,
): MedicationAdherence {
  const config = state.profile?.supports.find((s) => s.type === MEDICATION);
  const configured = Boolean(config?.enabled ?? config);
  const label = config?.label?.trim() || "Medication";

  const completedDates = medicationCompletionDates(state, today);
  const firstDoseDate = completedDates[0] ?? null;
  const takenToday =
    isSupportDoneToday(state, today, MEDICATION) ||
    completedDates.includes(today);

  if (!firstDoseDate) {
    return {
      firstDoseDate: null,
      daysCovered: 0,
      daysElapsed: 0,
      percent: null,
      takenToday,
      configured,
      label,
    };
  }

  const window = datesInRange(firstDoseDate, today);
  const coveredSet = new Set(completedDates);
  const daysCovered = window.filter((d) => coveredSet.has(d)).length;
  const daysElapsed = window.length;
  const percent =
    daysElapsed === 0 ? 0 : Math.round((100 * daysCovered) / daysElapsed);

  return {
    firstDoseDate,
    daysCovered,
    daysElapsed,
    percent,
    takenToday,
    configured,
    label,
  };
}
