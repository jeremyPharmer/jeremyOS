import { addDays, calendarDaysBetween, newId } from "./journey";
import type {
  RebuildState,
  VitalsPeriod,
  VitalsReading,
} from "./types";

export type VitalsMetric = "systolic" | "diastolic" | "heartRate";

export type VitalsAxis = "bp" | "hr";

export const VITALS_METRICS: {
  key: VitalsMetric;
  label: string;
  color: string;
  axis: VitalsAxis;
  unit: string;
}[] = [
  { key: "systolic", label: "Systolic", color: "#c45c4a", axis: "bp", unit: "mmHg" },
  { key: "diastolic", label: "Diastolic", color: "#d48a4a", axis: "bp", unit: "mmHg" },
  { key: "heartRate", label: "HR", color: "#4a7eb5", axis: "hr", unit: "bpm" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isVitalsPeriod(v: unknown): v is VitalsPeriod {
  return v === "am" || v === "pm";
}

export function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Sanity bounds only — not clinical guidance. */
export function parseVitalsInput(raw: {
  date?: unknown;
  period?: unknown;
  systolic?: unknown;
  diastolic?: unknown;
  heartRate?: unknown;
}):
  | { ok: true; date: string; period: VitalsPeriod; systolic: number; diastolic: number; heartRate: number }
  | { ok: false; error: string } {
  const date = String(raw.date ?? "").trim();
  if (!DATE_RE.test(date)) {
    return { ok: false, error: "Date required" };
  }
  if (!isVitalsPeriod(raw.period)) {
    return { ok: false, error: "Choose AM or PM" };
  }
  const systolic = clampInt(Number(raw.systolic), 70, 250);
  const diastolic = clampInt(Number(raw.diastolic), 40, 150);
  const heartRate = clampInt(Number(raw.heartRate), 30, 220);
  if (!Number.isFinite(Number(raw.systolic)) || Number(raw.systolic) <= 0) {
    return { ok: false, error: "Systolic required" };
  }
  if (!Number.isFinite(Number(raw.diastolic)) || Number(raw.diastolic) <= 0) {
    return { ok: false, error: "Diastolic required" };
  }
  if (!Number.isFinite(Number(raw.heartRate)) || Number(raw.heartRate) <= 0) {
    return { ok: false, error: "Heart rate required" };
  }
  if (systolic <= diastolic) {
    return { ok: false, error: "Systolic should be higher than diastolic" };
  }
  return {
    ok: true,
    date,
    period: raw.period,
    systolic,
    diastolic,
    heartRate,
  };
}

export function addVitalsReading(
  state: RebuildState,
  input: {
    date: string;
    period: VitalsPeriod;
    systolic: number;
    diastolic: number;
    heartRate: number;
  },
): RebuildState {
  const reading: VitalsReading = {
    id: newId("vitals"),
    date: input.date,
    period: input.period,
    systolic: input.systolic,
    diastolic: input.diastolic,
    heartRate: input.heartRate,
    loggedAt: new Date().toISOString(),
  };
  const prev = state.vitals ?? [];
  // One reading per date+period — replace if re-logged.
  const next = [
    ...prev.filter(
      (r) => !(r.date === reading.date && r.period === reading.period),
    ),
    reading,
  ].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (a.period === b.period ? 0 : a.period === "pm" ? -1 : 1) ||
      b.loggedAt.localeCompare(a.loggedAt),
  );
  return { ...state, vitals: next };
}

export function removeVitalsReading(
  state: RebuildState,
  id: string,
): RebuildState {
  const prev = state.vitals ?? [];
  const next = prev.filter((r) => r.id !== id);
  if (next.length === prev.length) return state;
  return { ...state, vitals: next };
}

export function vitalsSorted(state: RebuildState): VitalsReading[] {
  return [...(state.vitals ?? [])].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (a.period === b.period ? 0 : a.period === "pm" ? -1 : 1) ||
      b.loggedAt.localeCompare(a.loggedAt),
  );
}

export type VitalsTrendPoint = {
  date: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
};

/**
 * One point per calendar day in range. When AM and PM both exist,
 * use the later period (PM) for the day series.
 */
export function vitalsTrendPointsInRange(
  state: RebuildState,
  start: string,
  end: string,
): VitalsTrendPoint[] {
  if (!start || !end || start > end) return [];
  const byDate = new Map<string, VitalsReading>();
  for (const r of state.vitals ?? []) {
    if (r.date < start || r.date > end) continue;
    const existing = byDate.get(r.date);
    if (!existing) {
      byDate.set(r.date, r);
      continue;
    }
    // Prefer PM over AM; else newer loggedAt
    if (r.period === "pm" && existing.period === "am") {
      byDate.set(r.date, r);
    } else if (r.period === existing.period && r.loggedAt > existing.loggedAt) {
      byDate.set(r.date, r);
    }
  }

  const days = calendarDaysBetween(start, end) + 1;
  const out: VitalsTrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const r = byDate.get(date);
    out.push(
      r
        ? {
            date,
            systolic: r.systolic,
            diastolic: r.diastolic,
            heartRate: r.heartRate,
          }
        : { date },
    );
  }
  return out;
}

/** Drop empty leading/trailing days so the chart focuses on logged span. */
export function filledVitalsPointsInRange(
  state: RebuildState,
  start: string,
  end: string,
): VitalsTrendPoint[] {
  const points = vitalsTrendPointsInRange(state, start, end);
  const first = points.findIndex(
    (p) =>
      p.systolic != null || p.diastolic != null || p.heartRate != null,
  );
  if (first === -1) return [];
  let last = points.length - 1;
  while (
    last > first &&
    points[last]!.systolic == null &&
    points[last]!.diastolic == null &&
    points[last]!.heartRate == null
  ) {
    last -= 1;
  }
  return points.slice(first, last + 1);
}

export function formatVitalsReading(r: VitalsReading): string {
  return `${r.systolic}/${r.diastolic} mmHg · ${r.heartRate} bpm`;
}
