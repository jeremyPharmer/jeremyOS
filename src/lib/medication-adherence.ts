import {
  longTermTrackerAdherenceList,
  trackerAdherence,
  trackerCompletionDates,
} from "./tracker-adherence";
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
  return trackerCompletionDates(state, MEDICATION, today);
}

/**
 * % of expected doses covered from the first logged dose through today.
 * Daily (7/wk) target → days covered ÷ days elapsed. RB-031 / RB-033.
 */
export function medicationAdherence(
  state: RebuildState,
  today: string,
): MedicationAdherence {
  const config = state.profile?.supports.find((s) => s.type === MEDICATION);
  const configured = Boolean(config?.enabled ?? config);
  const label = config?.label?.trim() || "Medication";

  if (!config) {
    return {
      firstDoseDate: null,
      daysCovered: 0,
      daysElapsed: 0,
      percent: null,
      takenToday: false,
      configured: false,
      label,
    };
  }

  const row = trackerAdherence(
    state,
    { ...config, enabled: true },
    today,
  );

  return {
    firstDoseDate: row.firstLogDate,
    daysCovered: row.completed,
    daysElapsed: row.daysElapsed,
    percent: row.percent,
    takenToday: row.doneToday,
    configured,
    label,
  };
}

export { longTermTrackerAdherenceList };
