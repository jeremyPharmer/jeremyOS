import {
  CLEARED_LEGACY_SUPPORT_TYPES,
  DEFAULT_SUPPORTS,
  type SupportConfig,
} from "./types";

export type LongTermTrackersMigration = {
  supports: SupportConfig[];
  /** Set after one-time clear of legacy canned weekly supports (RB-033). */
  longTermTrackingCleared: boolean;
};

function ensureMedication(supports: SupportConfig[]): SupportConfig[] {
  const hasMedication = supports.some((s) => s.type === "medication");
  if (!hasMedication) {
    return [...DEFAULT_SUPPORTS, ...supports];
  }
  return supports.length > 0 ? supports : [...DEFAULT_SUPPORTS];
}

/**
 * Normalize profile long-term trackers.
 * First load after RB-033: drop legacy canned types (recovery/meditation/gym/…).
 * Later loads: keep whatever the user configured (including re-added canned types).
 */
export function migrateLongTermTrackers(
  supports: SupportConfig[] | undefined | null,
  alreadyCleared: boolean | undefined,
): LongTermTrackersMigration {
  const raw = (Array.isArray(supports) ? supports : []).filter(
    (s) => s && typeof s.type === "string" && s.type.length > 0,
  );

  if (alreadyCleared) {
    return {
      supports: ensureMedication(raw),
      longTermTrackingCleared: true,
    };
  }

  const kept = raw.filter((s) => !CLEARED_LEGACY_SUPPORT_TYPES.has(s.type));
  return {
    supports: ensureMedication(kept),
    longTermTrackingCleared: true,
  };
}
