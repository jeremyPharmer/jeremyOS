"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ActiveWorkoutPanel } from "@/components/workouts/ActiveWorkoutPanel";
import type {
  WorkoutExerciseActual,
  WorkoutType,
} from "@/lib/types";
import {
  blankActualsFromRoutine,
  findRoutine,
  lastExerciseActualsForRoutine,
  parseRoutineSelectValue,
  repModeLabel,
  routineSelectValue,
  routinesForType,
  WORKOUT_CUSTOM,
  WORKOUT_PRESETS,
  WORKOUT_TYPES,
} from "@/lib/workouts";

export function WorkoutLogForm({
  date,
  onLogged,
  variant = "full",
}: {
  date: string;
  onLogged?: () => void;
  /** Home quick log: type + workout only (starts session) */
  variant?: "quick" | "full";
}) {
  const { state, post } = useApp();
  const active = state.activeWorkout ?? null;

  const [type, setType] = useState<WorkoutType>("run");
  const [workout, setWorkout] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [actuals, setActuals] = useState<WorkoutExerciseActual[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const typeRoutines = useMemo(
    () => routinesForType(state.workoutRoutines, type),
    [state.workoutRoutines, type],
  );

  const routineId = parseRoutineSelectValue(workout);
  const selectedRoutine = routineId
    ? findRoutine(state.workoutRoutines, routineId)
    : undefined;
  const isCustom = workout === WORKOUT_CUSTOM;
  const label = selectedRoutine
    ? selectedRoutine.name
    : isCustom
      ? customLabel.trim()
      : workout.trim();
  const canStart = Boolean(label) && !busy;

  useEffect(() => {
    setWorkout("");
    setCustomLabel("");
    setActuals([]);
  }, [type]);

  useEffect(() => {
    const id = parseRoutineSelectValue(workout);
    if (!id) {
      setActuals([]);
      return;
    }
    const r = findRoutine(state.workoutRoutines, id);
    const previous = lastExerciseActualsForRoutine(state.workouts, id);
    setActuals(r ? blankActualsFromRoutine(r, previous) : []);
  }, [workout, state.workoutRoutines, state.workouts]);

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    patch: { reps?: string; weight?: string },
  ) {
    setActuals((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIndex) return s;
            const next = { ...s };
            if (patch.reps != null) {
              const n = Number(patch.reps);
              next.reps = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
            }
            if (patch.weight != null && ex.tracksWeight) {
              const n = Number(patch.weight);
              next.weight =
                patch.weight === "" || !Number.isFinite(n) ? undefined : n;
            }
            return next;
          }),
        };
      }),
    );
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!label) return;
    setBusy(true);
    setError("");
    try {
      const exerciseActuals =
        selectedRoutine && actuals.length
          ? actuals.map((ex) => ({
              exerciseId: ex.exerciseId,
              name: ex.name,
              tracksWeight: ex.tracksWeight,
              repMode: ex.repMode,
              sets: ex.sets.map((s) =>
                ex.tracksWeight
                  ? { reps: s.reps || 0, weight: s.weight }
                  : { reps: s.reps || 0 },
              ),
            }))
          : undefined;

      await post("/api/workouts", {
        action: "start_session",
        date,
        type,
        label,
        routineId: selectedRoutine?.id,
        exerciseActuals,
      });
      setWorkout("");
      setCustomLabel("");
      setActuals([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setBusy(false);
    }
  }

  if (active) {
    return (
      <ActiveWorkoutPanel
        session={active}
        onEnded={() => onLogged?.()}
      />
    );
  }

  return (
    <form
      className={`workout-log-form${variant === "quick" ? " workout-log-form-quick" : " panel"}`}
      onSubmit={start}
      autoComplete="off"
    >
      <p className="eyebrow">Start workout</p>

      <fieldset className="workout-log-field">
        <legend className="workout-log-label">Type</legend>
        <div className="workout-type-segment" role="group" aria-label="Workout type">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`workout-type-seg ${t.id}${type === t.id ? " active" : ""}`}
              onClick={() => setType(t.id)}
              aria-pressed={type === t.id}
            >
              <span className={`workout-marker ${t.id}`} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="workout-log-field">
        <span className="workout-log-label">Workout</span>
        <select
          className="workout-log-select"
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          aria-label="Choose workout"
          name="rebuild-workout-preset"
          autoComplete="off"
        >
          <option value="">Choose workout…</option>
          {typeRoutines.length > 0 && (
            <optgroup label="My routines">
              {typeRoutines.map((r) => (
                <option key={r.id} value={routineSelectValue(r.id)}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Quick start">
            {WORKOUT_PRESETS[type].map((presetName) => (
              <option key={presetName} value={presetName}>
                {presetName}
              </option>
            ))}
            <option value={WORKOUT_CUSTOM}>Other…</option>
          </optgroup>
        </select>
      </label>

      {isCustom && (
        <label className="workout-log-field">
          <span className="workout-log-label">Custom name</span>
          <input
            className="workout-log-input"
            placeholder="Name this workout"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            aria-label="Custom workout name"
            name="rebuild-workout-custom"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </label>
      )}

      {selectedRoutine && actuals.length > 0 && variant === "full" && (
        <div className="workout-actuals">
          <p className="workout-log-label">Planned sets</p>
          <p className="tiny muted">
            Timer starts when you begin — log weights as you go, then rate
            quality when you end.
          </p>
          {actuals.map((ex, ei) => (
            <div key={ex.exerciseId} className="workout-actual-ex">
              <p className="workout-actual-ex-name">{ex.name}</p>
              <div
                className={`workout-actual-set-table${ex.tracksWeight ? " has-weight" : ""}`}
              >
                <div className="workout-actual-set-head" aria-hidden>
                  <span>Set</span>
                  <span>{repModeLabel(ex.repMode)}</span>
                  {ex.tracksWeight ? <span>lb</span> : null}
                </div>
                {ex.sets.map((s, si) => (
                  <div
                    key={si}
                    className={`workout-actual-set-row${ex.tracksWeight ? " has-weight" : ""}`}
                  >
                    <span className="workout-actual-set-num">{si + 1}</span>
                    <input
                      className="workout-actual-input"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={ex.repMode === "seconds" ? 999 : 99}
                      value={s.reps || ""}
                      onChange={(e) =>
                        updateSet(ei, si, { reps: e.target.value })
                      }
                      aria-label={`${ex.name} set ${si + 1} ${repModeLabel(ex.repMode).toLowerCase()}`}
                      placeholder={ex.repMode === "seconds" ? "sec" : "reps"}
                    />
                    {ex.tracksWeight && (
                      <input
                        className="workout-actual-input"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        value={s.weight ?? ""}
                        onChange={(e) =>
                          updateSet(ei, si, { weight: e.target.value })
                        }
                        aria-label={`${ex.name} set ${si + 1} weight`}
                        placeholder="lb"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        className="btn primary workout-log-submit"
        disabled={!canStart}
      >
        {busy ? "Starting…" : "Start workout"}
      </button>

      {error && (
        <p className="tiny workout-log-error">{error}</p>
      )}
    </form>
  );
}
