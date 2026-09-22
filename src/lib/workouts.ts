import { datesInRange, formatDate, weekBounds } from "./journey";
import type {
  LiftType,
  WorkoutCategory,
  WorkoutExerciseActual,
  WorkoutLog,
  WorkoutPr,
  WorkoutRepMode,
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutSetActual,
  WorkoutType,
} from "./types";

export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "run", label: "Run" },
  { id: "hiit", label: "HIIT" },
  { id: "lift", label: "Lift" },
  { id: "stretch", label: "Stretch" },
];

export const WORKOUT_PRESETS: Record<WorkoutType, string[]> = {
  run: ["Easy run", "Long run", "Tempo", "Intervals", "Recovery jog", "5K", "10K"],
  hiit: ["Tabata", "Circuit", "AMRAP", "EMOM", "Boot camp", "Sprints"],
  lift: ["Upper body", "Lower body", "Full body", "Push day", "Pull day", "Leg day"],
  stretch: ["Yoga", "Mobility", "Full body mobility", "Foam roll", "Static stretch", "Recovery flow"],
};

export const WORKOUT_CUSTOM = "__custom__";
export const WORKOUT_ROUTINE_PREFIX = "routine:";

export const WORKOUT_QUALITY_MAX = 5;

const WORKOUT_TYPE_SET = new Set<WorkoutType>(
  WORKOUT_TYPES.map((t) => t.id),
);

export function isWorkoutType(raw: unknown): raw is WorkoutType {
  return typeof raw === "string" && WORKOUT_TYPE_SET.has(raw as WorkoutType);
}

export function routineSelectValue(id: string): string {
  return `${WORKOUT_ROUTINE_PREFIX}${id}`;
}

export function parseRoutineSelectValue(value: string): string | null {
  if (!value.startsWith(WORKOUT_ROUTINE_PREFIX)) return null;
  const id = value.slice(WORKOUT_ROUTINE_PREFIX.length);
  return id || null;
}

/** Clamp quality to 1–5; missing/invalid → undefined */
export function normalizeQuality(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > WORKOUT_QUALITY_MAX) return undefined;
  return rounded;
}

export function workoutTypeLabel(type: WorkoutType | undefined): string {
  return WORKOUT_TYPES.find((t) => t.id === type)?.label ?? "Workout";
}

function legacyTypeFromRow(
  category?: WorkoutCategory,
  liftType?: LiftType,
): WorkoutType {
  if (category === "run") return "run";
  if (liftType === "hiit") return "hiit";
  if (liftType === "stretch") return "stretch";
  return "lift";
}

function resolveWorkoutType(raw: {
  type?: WorkoutType;
  category?: WorkoutCategory;
  liftType?: LiftType;
}): WorkoutType {
  if (raw.type && WORKOUT_TYPE_SET.has(raw.type)) return raw.type;
  return legacyTypeFromRow(raw.category, raw.liftType);
}

function normalizeRepMode(raw: unknown): WorkoutRepMode {
  return raw === "seconds" ? "seconds" : "reps";
}

function normalizePositiveInt(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(99, Math.round(n));
}

function normalizeSetActual(raw: unknown): WorkoutSetActual | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const reps = normalizePositiveInt(row.reps, 0);
  if (reps < 1) return null;
  const weightRaw = row.weight;
  const weight =
    weightRaw === undefined || weightRaw === null || weightRaw === ""
      ? undefined
      : Number(weightRaw);
  return {
    reps,
    weight:
      weight != null && Number.isFinite(weight) && weight >= 0
        ? weight
        : undefined,
  };
}

export function normalizeExerciseActuals(
  raw: unknown,
): WorkoutExerciseActual[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: WorkoutExerciseActual[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const sets = Array.isArray(row.sets)
      ? row.sets
          .map(normalizeSetActual)
          .filter((s): s is WorkoutSetActual => s != null)
      : [];
    if (sets.length === 0) continue;
    out.push({
      exerciseId: String(row.exerciseId ?? "").trim() || name,
      name,
      tracksWeight: Boolean(row.tracksWeight),
      repMode: normalizeRepMode(row.repMode),
      sets: sets.map((s) =>
        row.tracksWeight
          ? s
          : { reps: s.reps },
      ),
    });
  }
  return out.length ? out : undefined;
}

function normalizeRoutineExercise(
  raw: unknown,
): WorkoutRoutineExercise | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  return {
    id: String(row.id ?? "").trim() || name,
    name,
    sets: normalizePositiveInt(row.sets, 3),
    reps: normalizePositiveInt(row.reps, 10),
    repMode: normalizeRepMode(row.repMode),
    tracksWeight: Boolean(row.tracksWeight),
  };
}

export function normalizeRoutine(raw: WorkoutRoutine): WorkoutRoutine {
  const type = isWorkoutType(raw.type) ? raw.type : "lift";
  const exercises = (raw.exercises ?? [])
    .map(normalizeRoutineExercise)
    .filter((e): e is WorkoutRoutineExercise => e != null);
  return {
    ...raw,
    type,
    name: String(raw.name ?? "").trim() || "Routine",
    exercises,
  };
}

export function normalizeRoutines(
  routines: WorkoutRoutine[] | undefined,
): WorkoutRoutine[] {
  return (routines ?? []).map(normalizeRoutine);
}

export function routinesForType(
  routines: WorkoutRoutine[] | undefined,
  type: WorkoutType,
): WorkoutRoutine[] {
  return normalizeRoutines(routines)
    .filter((r) => r.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findRoutine(
  routines: WorkoutRoutine[] | undefined,
  id: string,
): WorkoutRoutine | undefined {
  return normalizeRoutines(routines).find((r) => r.id === id);
}

/**
 * Most recent logged session for a routine that includes set actuals.
 * Newest by date, then createdAt.
 */
export function lastExerciseActualsForRoutine(
  workouts: WorkoutLog[] | undefined,
  routineId: string,
): WorkoutExerciseActual[] | undefined {
  if (!routineId) return undefined;
  const match = normalizeWorkouts(workouts)
    .filter(
      (w) =>
        w.routineId === routineId &&
        Array.isArray(w.exerciseActuals) &&
        w.exerciseActuals.length > 0,
    )
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    })[0];
  return match?.exerciseActuals;
}

function previousActualForExercise(
  previous: WorkoutExerciseActual[] | undefined,
  exerciseId: string,
  name: string,
): WorkoutExerciseActual | undefined {
  if (!previous?.length) return undefined;
  const byId = previous.find((p) => p.exerciseId === exerciseId);
  if (byId) return byId;
  const lower = name.trim().toLowerCase();
  return previous.find((p) => p.name.trim().toLowerCase() === lower);
}

/**
 * Seed actual rows from a routine plan.
 * Reps come from the plan; weights default from the last logged session
 * for that routine (matched by exercise id, then name).
 */
export function blankActualsFromRoutine(
  routine: WorkoutRoutine,
  previousActuals?: WorkoutExerciseActual[] | undefined,
): WorkoutExerciseActual[] {
  return normalizeRoutine(routine).exercises.map((ex) => {
    const prev = previousActualForExercise(
      previousActuals,
      ex.id,
      ex.name,
    );
    return {
      exerciseId: ex.id,
      name: ex.name,
      tracksWeight: ex.tracksWeight,
      repMode: ex.repMode ?? "reps",
      sets: Array.from({ length: ex.sets }, (_, setIndex) => {
        const prevWeight = prev?.sets[setIndex]?.weight;
        return {
          reps: ex.reps,
          weight:
            ex.tracksWeight &&
            prevWeight != null &&
            Number.isFinite(prevWeight) &&
            prevWeight >= 0
              ? prevWeight
              : undefined,
        };
      }),
    };
  });
}

export function repModeLabel(mode: WorkoutRepMode | undefined): string {
  return mode === "seconds" ? "Sec" : "Reps";
}

/** Short summary for day list: "3×10 @ 135" style */
export function formatExerciseActualSummary(
  actuals: WorkoutExerciseActual[] | undefined,
): string {
  if (!actuals?.length) return "";
  return actuals
    .map((ex) => {
      const unit = ex.repMode === "seconds" ? "s" : "";
      const parts = ex.sets.map((s) => {
        if (ex.tracksWeight && s.weight != null) {
          return `${s.reps}${unit}×${s.weight}`;
        }
        return `${s.reps}${unit}`;
      });
      return `${ex.name} ${parts.join(", ")}`;
    })
    .join(" · ");
}

/** Legacy rows without type default to lift; lift+weights → lift */
export function normalizeWorkout(raw: WorkoutLog): WorkoutLog {
  const type = resolveWorkoutType(raw);
  const quality = normalizeQuality(raw.quality);
  const exerciseActuals = normalizeExerciseActuals(raw.exerciseActuals);
  return {
    ...raw,
    type,
    quality,
    routineId: raw.routineId ? String(raw.routineId) : undefined,
    exerciseActuals,
  };
}

export function normalizeWorkoutPr(raw: WorkoutPr): WorkoutPr {
  const type = resolveWorkoutType(raw);
  return { ...raw, type };
}

export function normalizeWorkouts(
  workouts: WorkoutLog[] | undefined,
): WorkoutLog[] {
  return (workouts ?? []).map(normalizeWorkout);
}

export function normalizeWorkoutPrs(
  prs: WorkoutPr[] | undefined,
): WorkoutPr[] {
  return (prs ?? []).map(normalizeWorkoutPr);
}

export function countsForDates(
  workouts: WorkoutLog[] | undefined,
  dates: Set<string>,
): Record<WorkoutType, number> {
  const counts: Record<WorkoutType, number> = {
    run: 0,
    hiit: 0,
    lift: 0,
    stretch: 0,
  };
  for (const w of normalizeWorkouts(workouts)) {
    if (dates.has(w.date)) counts[w.type!] += 1;
  }
  return counts;
}

export function minutesForDates(
  workouts: WorkoutLog[] | undefined,
  dates: Set<string>,
): number {
  return normalizeWorkouts(workouts)
    .filter((w) => dates.has(w.date))
    .reduce((sum, w) => sum + (w.durationMin ?? 0), 0);
}

/** Quality points: each session contributes its 1–5 quality score */
export function qualityPointsForDates(
  workouts: WorkoutLog[] | undefined,
  dates: Set<string>,
): number {
  return normalizeWorkouts(workouts)
    .filter((w) => dates.has(w.date))
    .reduce((sum, w) => sum + (w.quality ?? 0), 0);
}

export function recentWorkouts(
  workouts: WorkoutLog[] | undefined,
  limit = 5,
): WorkoutLog[] {
  return normalizeWorkouts(workouts)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function workoutsForDate(
  workouts: WorkoutLog[] | undefined,
  date: string,
): WorkoutLog[] {
  return normalizeWorkouts(workouts).filter((w) => w.date === date);
}

/** MM/DD for workout history rows */
export function formatWorkoutListDate(date: string): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[1]}/${parts[2]}`;
}

/** Workouts in a calendar month, newest first. */
export function workoutsInMonth(
  workouts: WorkoutLog[] | undefined,
  key: string,
): WorkoutLog[] {
  return normalizeWorkouts(workouts)
    .filter((w) => w.date.startsWith(key))
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function workoutsByDate(
  workouts: WorkoutLog[] | undefined,
): Map<string, WorkoutLog[]> {
  const map = new Map<string, WorkoutLog[]>();
  for (const w of normalizeWorkouts(workouts)) {
    const list = map.get(w.date) ?? [];
    list.push(w);
    map.set(w.date, list);
  }
  return map;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export function shiftMonthKey(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

/** Sunday-start weeks; null pads leading/trailing blanks */
export function buildMonthGrid(
  year: number,
  month: number,
): (string | null)[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const days: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(formatDate(new Date(year, month - 1, d)));
  }
  while (days.length % 7 !== 0) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Month name only (no year) — matches Home calendar + workouts month headers. */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
  });
}

export type DayWorkoutSummary = {
  types: WorkoutType[];
};

export function summarizeDay(workouts: WorkoutLog[]): DayWorkoutSummary {
  return {
    types: [...new Set(workouts.map((w) => w.type!))],
  };
}

export type PeriodWorkoutSummary = {
  counts: Record<WorkoutType, number>;
  runMiles: number;
  totalMinutes: number;
  qualityPoints: number;
};

export function weekWorkoutSummary(
  workouts: WorkoutLog[] | undefined,
  anchorDate: string,
): PeriodWorkoutSummary {
  const { start, end } = weekBounds(anchorDate);
  const dates = new Set(datesInRange(start, end));
  return {
    counts: countsForDates(workouts, dates),
    runMiles: weekRunMiles(workouts, anchorDate),
    totalMinutes: minutesForDates(workouts, dates),
    qualityPoints: qualityPointsForDates(workouts, dates),
  };
}

export function monthWorkoutSummary(
  workouts: WorkoutLog[] | undefined,
  year: number,
  month: number,
): PeriodWorkoutSummary {
  const prefix = monthKey(year, month);
  const dates = new Set(
    normalizeWorkouts(workouts)
      .filter((w) => w.date.startsWith(prefix))
      .map((w) => w.date),
  );
  return {
    counts: countsForDates(workouts, dates),
    runMiles: monthRunMiles(workouts, year, month),
    totalMinutes: minutesForDates(workouts, dates),
    qualityPoints: qualityPointsForDates(workouts, dates),
  };
}

export function weekRunMiles(
  workouts: WorkoutLog[] | undefined,
  anchorDate: string,
): number {
  const { start, end } = weekBounds(anchorDate);
  const week = new Set(datesInRange(start, end));
  return normalizeWorkouts(workouts)
    .filter((w) => w.type === "run" && week.has(w.date))
    .reduce((sum, w) => sum + (w.distanceMiles ?? 0), 0);
}

export function monthRunMiles(
  workouts: WorkoutLog[] | undefined,
  year: number,
  month: number,
): number {
  const prefix = monthKey(year, month);
  return normalizeWorkouts(workouts)
    .filter((w) => w.type === "run" && w.date.startsWith(prefix))
    .reduce((sum, w) => sum + (w.distanceMiles ?? 0), 0);
}

export function prsForType(
  prs: WorkoutPr[] | undefined,
  type: WorkoutType,
): WorkoutPr[] {
  return normalizeWorkoutPrs(prs)
    .filter((p) => p.type === type)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
}

export function formatMiles(n: number): string {
  if (n === 0) return "0";
  return n < 10 ? n.toFixed(1) : String(Math.round(n * 10) / 10);
}

export function gymSupportForType(type: WorkoutType): boolean {
  return type !== "run";
}
