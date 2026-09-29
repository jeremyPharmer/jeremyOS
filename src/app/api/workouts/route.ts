import { NextResponse } from "next/server";
import { todayInTz, newId } from "@/lib/journey";
import {
  elapsedDurationMin,
  isWorkoutType,
  normalizeActiveWorkout,
  normalizeExerciseActuals,
  normalizeQuality,
  normalizeRoutine,
  normalizeWorkout,
  normalizeWorkoutPr,
} from "@/lib/workouts";
import { updateState } from "@/lib/store";
import type {
  ActiveWorkoutSession,
  WorkoutLog,
  WorkoutPr,
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutType,
} from "@/lib/types";

function parseWorkoutType(body: Record<string, unknown>): WorkoutType {
  const raw = body.type ?? body.category;
  if (isWorkoutType(raw)) return raw;
  if (raw === "weights") return "lift";
  if (body.category === "lift") {
    if (body.liftType === "hiit") return "hiit";
    if (body.liftType === "stretch") return "stretch";
    return "lift";
  }
  return "lift";
}

function parseRoutineExercises(
  raw: unknown,
): WorkoutRoutineExercise[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkoutRoutineExercise[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const sets = Math.min(99, Math.max(1, Math.round(Number(row.sets) || 3)));
    const reps = Math.min(99, Math.max(1, Math.round(Number(row.reps) || 10)));
    out.push({
      id: String(row.id ?? "").trim() || newId("ex"),
      name,
      sets,
      reps,
      repMode: row.repMode === "seconds" ? "seconds" : "reps",
      tracksWeight: Boolean(row.tracksWeight),
    });
  }
  return out;
}

function parseOptionalDistance(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "log");

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }

      const workouts = [...(prev.workouts ?? [])].map(normalizeWorkout);
      const workoutPrs = [...(prev.workoutPrs ?? [])].map(normalizeWorkoutPr);
      const workoutRoutines = [...(prev.workoutRoutines ?? [])].map(
        normalizeRoutine,
      );
      const activeWorkout = normalizeActiveWorkout(prev.activeWorkout);

      if (action === "delete") {
        const id = String(body.id ?? "");
        return {
          ...prev,
          workouts: workouts.filter((w) => w.id !== id),
        };
      }

      if (action === "delete_pr") {
        const id = String(body.id ?? "");
        return {
          ...prev,
          workoutPrs: workoutPrs.filter((p) => p.id !== id),
        };
      }

      if (action === "set_pr") {
        const type = parseWorkoutType(body);
        const name = String(body.name ?? "").trim();
        const value = Number(body.value);
        if (!name || !Number.isFinite(value)) {
          const err = new Error("PR name and value required");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const row: WorkoutPr = {
          id: newId(),
          type,
          name,
          value,
          unit:
            String(body.unit ?? "").trim() ||
            (type === "run" ? "mi" : type === "lift" ? "lb" : "min"),
          date: String(body.date ?? todayInTz(prev.profile.timezone)),
          workoutId: body.workoutId ? String(body.workoutId) : undefined,
          notes: body.notes ? String(body.notes) : undefined,
          createdAt: new Date().toISOString(),
        };
        return { ...prev, workoutPrs: [row, ...workoutPrs] };
      }

      if (action === "delete_routine") {
        const id = String(body.id ?? "");
        return {
          ...prev,
          workoutRoutines: workoutRoutines.filter((r) => r.id !== id),
        };
      }

      if (action === "save_routine") {
        const name = String(body.name ?? "").trim();
        const type = parseWorkoutType(body);
        const exercises = parseRoutineExercises(body.exercises);
        if (!name) {
          const err = new Error("Routine name required");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        if (exercises.length === 0) {
          const err = new Error("Add at least one exercise");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const existingId = body.id ? String(body.id) : "";
        const now = new Date().toISOString();
        if (existingId) {
          const idx = workoutRoutines.findIndex((r) => r.id === existingId);
          if (idx === -1) {
            const err = new Error("Routine not found");
            (err as Error & { status: number }).status = 404;
            throw err;
          }
          const updated: WorkoutRoutine = {
            ...workoutRoutines[idx],
            name,
            type,
            exercises,
            updatedAt: now,
          };
          const next = [...workoutRoutines];
          next[idx] = updated;
          return { ...prev, workoutRoutines: next };
        }
        const row: WorkoutRoutine = {
          id: newId("routine"),
          name,
          type,
          exercises,
          createdAt: now,
        };
        return { ...prev, workoutRoutines: [row, ...workoutRoutines] };
      }

      if (action === "start_session") {
        if (activeWorkout) {
          const err = new Error("A workout is already in progress");
          (err as Error & { status: number }).status = 409;
          throw err;
        }
        const date = String(body.date ?? todayInTz(prev.profile.timezone));
        const type = parseWorkoutType(body);
        const label = String(body.label ?? "").trim();
        if (!label) {
          const err = new Error("Workout label required");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const now = new Date().toISOString();
        const session: ActiveWorkoutSession = {
          id: newId("active_workout"),
          startedAt: now,
          date,
          type,
          label,
          routineId: body.routineId ? String(body.routineId).trim() : undefined,
          exerciseActuals: normalizeExerciseActuals(body.exerciseActuals),
          distanceMiles: parseOptionalDistance(body.distanceMiles),
          notes: body.notes ? String(body.notes) : undefined,
          updatedAt: now,
        };
        return { ...prev, activeWorkout: session };
      }

      if (action === "update_session") {
        if (!activeWorkout) {
          const err = new Error("No workout in progress");
          (err as Error & { status: number }).status = 404;
          throw err;
        }
        const now = new Date().toISOString();
        const next: ActiveWorkoutSession = {
          ...activeWorkout,
          exerciseActuals:
            body.exerciseActuals !== undefined
              ? normalizeExerciseActuals(body.exerciseActuals)
              : activeWorkout.exerciseActuals,
          distanceMiles:
            body.distanceMiles !== undefined
              ? parseOptionalDistance(body.distanceMiles)
              : activeWorkout.distanceMiles,
          notes:
            body.notes !== undefined
              ? body.notes
                ? String(body.notes)
                : undefined
              : activeWorkout.notes,
          updatedAt: now,
        };
        return { ...prev, activeWorkout: next };
      }

      if (action === "discard_session") {
        return { ...prev, activeWorkout: null };
      }

      if (action === "end_session") {
        if (!activeWorkout) {
          const err = new Error("No workout in progress");
          (err as Error & { status: number }).status = 404;
          throw err;
        }
        const quality = normalizeQuality(body.quality);
        if (quality == null) {
          const err = new Error("Quality rating 1–5 required");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const endedAt = Date.now();
        const durationMin =
          body.durationMin != null && Number.isFinite(Number(body.durationMin))
            ? Math.max(0, Math.round(Number(body.durationMin)))
            : elapsedDurationMin(
                endedAt - Date.parse(activeWorkout.startedAt),
              );
        const exerciseActuals =
          body.exerciseActuals !== undefined
            ? normalizeExerciseActuals(body.exerciseActuals)
            : activeWorkout.exerciseActuals;
        const distanceMiles =
          body.distanceMiles !== undefined
            ? parseOptionalDistance(body.distanceMiles)
            : activeWorkout.distanceMiles;
        const notes =
          body.notes !== undefined
            ? body.notes
              ? String(body.notes)
              : undefined
            : activeWorkout.notes;

        const row: WorkoutLog = {
          id: newId(),
          date: activeWorkout.date,
          type: activeWorkout.type,
          label: activeWorkout.label,
          quality,
          durationMin: durationMin > 0 ? durationMin : undefined,
          distanceMiles,
          notes,
          routineId: activeWorkout.routineId,
          exerciseActuals,
          createdAt: new Date(endedAt).toISOString(),
        };
        return {
          ...prev,
          workouts: [row, ...workouts],
          activeWorkout: null,
        };
      }

      const date = String(body.date ?? todayInTz(prev.profile.timezone));
      const type = parseWorkoutType(body);
      const label = String(body.label ?? "").trim();
      const quality = normalizeQuality(body.quality);
      if (!label) {
        const err = new Error("Workout label required");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      if (quality == null) {
        const err = new Error("Quality rating 1–5 required");
        (err as Error & { status: number }).status = 400;
        throw err;
      }

      const exerciseActuals = normalizeExerciseActuals(body.exerciseActuals);
      const routineId = body.routineId
        ? String(body.routineId).trim()
        : undefined;

      const row: WorkoutLog = {
        id: newId(),
        date,
        type,
        label,
        quality,
        durationMin:
          body.durationMin != null ? Number(body.durationMin) : undefined,
        distanceMiles:
          body.distanceMiles != null ? Number(body.distanceMiles) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
        routineId,
        exerciseActuals,
        createdAt: new Date().toISOString(),
      };

      return { ...prev, workouts: [row, ...workouts] };
    });

    return NextResponse.json({ state });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
