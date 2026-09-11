import { datesInRange, isSupportDoneToday } from "./journey";
import type { RebuildState, SupportType } from "./types";

const MEDICATION: SupportType = "medication";

export type MedicationAdherence = {
  /** Earliest completed medication day, or null if never logged. */
  firstDoseDate: string | null;
  /** Distinct days with a completed medication support in [firstDoseDate, today]. */
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

/**
 * % of calendar days covered by medication support completions
 * from the first logged dose through today (inclusive). RB-031.
 */
export function medicationAdherence(
  state: RebuildState,
  today: string,
): MedicationAdherence {
  const config = state.profile?.supports.find((s) => s.type === MEDICATION);
  const configured = Boolean(config?.enabled ?? config);
  const label = config?.label?.trim() || "Medication";

  const completedDates = [
    ...new Set(
      state.supports
        .filter((s) => s.supportType === MEDICATION && s.completed)
        .map((s) => s.date)
        .filter((d) => d <= today),
    ),
  ].sort();

  const firstDoseDate = completedDates[0] ?? null;
  const takenToday = isSupportDoneToday(state, today, MEDICATION);

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
