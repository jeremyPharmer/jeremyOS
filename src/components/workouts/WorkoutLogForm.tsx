"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ActiveWorkoutPanel } from "@/components/workouts/ActiveWorkoutPanel";
import type {
  WorkoutExerciseActual,
  WorkoutLog,
  WorkoutRoutine,
  WorkoutType,
} from "@/lib/types";
import {
  blankActualsFromRoutine,
  durationSecFromParts,
  findRoutine,
  formatPacePerMile,
  gymSupportForType,
  lastExerciseActualsForRoutine,
  parseRoutineSelectValue,
  repModeLabel,
  routineSelectValue,
  routinesForType,
  splitDurationSec,
  WORKOUT_CUSTOM,
  WORKOUT_PRESETS,
  WORKOUT_QUALITY_MAX,
  WORKOUT_TYPES,
  workoutDurationSec,
} from "@/lib/workouts";

const QUALITY_OPTIONS = Array.from(
  { length: WORKOUT_QUALITY_MAX },
  (_, i) => i + 1,
);

function parseNonNeg(raw: string): number {
  if (raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function selectValueForLog(
  log: WorkoutLog,
  routines: WorkoutRoutine[],
): { workout: string; customLabel: string } {
  const type = (log.type ?? "lift") as WorkoutType;
  if (log.routineId && findRoutine(routines, log.routineId)) {
    return { workout: routineSelectValue(log.routineId), customLabel: "" };
  }
  if (WORKOUT_PRESETS[type]?.includes(log.label)) {
    return { workout: log.label, customLabel: "" };
  }
  return { workout: WORKOUT_CUSTOM, customLabel: log.label };
}

export function WorkoutLogForm({
  date,
  onLogged,
  variant = "full",
  editingWorkout = null,
  onCancelEdit,
}: {
  date: string;
  onLogged?: () => void;
  /** Home quick log: type + workout only */
  variant?: "quick" | "full";
  editingWorkout?: WorkoutLog | null;
  onCancelEdit?: () => void;
}) {
  const { state, post } = useApp();
  const active = state.activeWorkout ?? null;
  const formRef = useRef<HTMLFormElement>(null);
  const skipTypeReset = useRef(false);
  const seededSelectRef = useRef<string | null>(null);

  const [type, setType] = useState<WorkoutType>("run");
  const [workout, setWorkout] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [actuals, setActuals] = useState<WorkoutExerciseActual[]>([]);
  const [mode, setMode] = useState<"choose" | "log">("choose");
  const [quality, setQuality] = useState<number | null>(null);
  const [distance, setDistance] = useState("");
  const [runMin, setRunMin] = useState("");
  const [runSec, setRunSec] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editingWorkout);
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
  const canAct = Boolean(label) && !busy;
  const showSets =
    actuals.length > 0 &&
    variant === "full" &&
    (Boolean(selectedRoutine) || isEditing);

  const runDurationSec = durationSecFromParts(
    parseNonNeg(runMin),
    parseNonNeg(runSec),
  );
  const paceLabel =
    type === "run"
      ? formatPacePerMile(Number(distance), runDurationSec)
      : null;

  const editingId = editingWorkout?.id ?? null;

  useEffect(() => {
    if (!editingWorkout) {
      seededSelectRef.current = null;
      return;
    }
    skipTypeReset.current = true;
    const t = (editingWorkout.type ?? "lift") as WorkoutType;
    const select = selectValueForLog(editingWorkout, state.workoutRoutines);
    seededSelectRef.current = select.workout;
    setType(t);
    setWorkout(select.workout);
    setCustomLabel(select.customLabel);
    setActuals(editingWorkout.exerciseActuals ?? []);
    setMode("log");
    setQuality(editingWorkout.quality ?? null);
    setDistance(
      editingWorkout.distanceMiles != null
        ? String(editingWorkout.distanceMiles)
        : "",
    );
    const dur = workoutDurationSec(editingWorkout);
    if (dur != null && dur > 0) {
      const parts = splitDurationSec(dur);
      setRunMin(String(parts.min));
      setRunSec(String(parts.sec));
    } else {
      setRunMin("");
      setRunSec("");
    }
    setNotes(editingWorkout.notes ?? "");
    setError("");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // Seed once per workout id; routines snapshot is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional seed-on-id
  }, [editingId]);

  useEffect(() => {
    if (skipTypeReset.current) {
      skipTypeReset.current = false;
      return;
    }
    seededSelectRef.current = null;
    setWorkout("");
    setCustomLabel("");
    setActuals([]);
    setDistance("");
    setRunMin("");
    setRunSec("");
    setError("");
    if (!editingWorkout) {
      setMode("choose");
      setQuality(null);
      setNotes("");
    }
  }, [type, editingWorkout]);

  useEffect(() => {
    // Keep logged sets while the edit seed selection is unchanged.
    if (editingId && seededSelectRef.current != null && workout === seededSelectRef.current) {
      return;
    }
    if (editingId && seededSelectRef.current != null && workout !== seededSelectRef.current) {
      seededSelectRef.current = null;
    }
    const id = parseRoutineSelectValue(workout);
    if (!id) {
      setActuals([]);
      return;
    }
    const r = findRoutine(state.workoutRoutines, id);
    const previous = lastExerciseActualsForRoutine(state.workouts, id);
    setActuals(r ? blankActualsFromRoutine(r, previous) : []);
  }, [workout, state.workoutRoutines, state.workouts, editingId]);

  function resetFields() {
    setWorkout("");
    setCustomLabel("");
    setActuals([]);
    setMode("choose");
    setQuality(null);
    setDistance("");
    setRunMin("");
    setRunSec("");
    setNotes("");
  }

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
              next.reps =
                Number.isFinite(n) && n >= 0 ? Math.min(99, Math.round(n)) : 0;
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

  function exercisePayload() {
    if (!actuals.length) return undefined;
    if (!selectedRoutine && !isEditing) return undefined;
    return actuals.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      tracksWeight: ex.tracksWeight,
      repMode: ex.repMode,
      sets: ex.sets.map((s) =>
        ex.tracksWeight
          ? { reps: Math.max(0, s.reps || 0), weight: s.weight }
          : { reps: Math.max(0, s.reps || 0) },
      ),
    }));
  }

  async function startSession() {
    if (!label || busy || isEditing) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/workouts", {
        action: "start_session",
        date,
        type,
        label,
        routineId: selectedRoutine?.id,
        exerciseActuals: exercisePayload(),
      });
      resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setBusy(false);
    }
  }

  async function logWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!label || quality == null || busy) return;
    setBusy(true);
    setError("");
    try {
      if (editingWorkout) {
        await post("/api/workouts", {
          action: "update",
          id: editingWorkout.id,
          date: editingWorkout.date,
          type,
          label,
          quality,
          routineId: selectedRoutine?.id ?? null,
          exerciseActuals: exercisePayload() ?? [],
          distanceMiles:
            type === "run" && distance ? Number(distance) : null,
          durationSec:
            type === "run" && runDurationSec > 0 ? runDurationSec : null,
          notes: notes.trim() || null,
        });
        resetFields();
        onCancelEdit?.();
        onLogged?.();
      } else {
        await post("/api/workouts", {
          action: "log",
          date,
          type,
          label,
          quality,
          routineId: selectedRoutine?.id,
          exerciseActuals: exercisePayload(),
          distanceMiles:
            type === "run" && distance ? Number(distance) : undefined,
          durationSec:
            type === "run" && runDurationSec > 0 ? runDurationSec : undefined,
          notes: notes.trim() || undefined,
        });
        if (gymSupportForType(type)) {
          await post("/api/support", {
            date,
            supportType: "gym",
            completed: true,
          });
        }
        resetFields();
        onLogged?.();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Could not update workout"
            : "Could not log workout",
      );
    } finally {
      setBusy(false);
    }
  }

  if (active && !isEditing) {
    return (
      <ActiveWorkoutPanel
        session={active}
        onEnded={() => onLogged?.()}
      />
    );
  }

  return (
    <form
      ref={formRef}
      className={`workout-log-form${variant === "quick" ? " workout-log-form-quick" : " panel"}${isEditing ? " workout-log-form-editing" : ""}`}
      onSubmit={mode === "log" ? logWorkout : (e) => e.preventDefault()}
      autoComplete="off"
    >
      <p className="eyebrow">
        {isEditing ? "Edit workout" : mode === "log" ? "Log workout" : "Workout"}
      </p>

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
          onChange={(e) => {
            setWorkout(e.target.value);
            if (!isEditing) setMode("choose");
          }}
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
          <optgroup label="Quick pick">
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

      {mode === "choose" && !isEditing && (
        <div className="workout-mode-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!canAct}
            onClick={() => void startSession()}
          >
            {busy ? "Starting…" : "Start"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={!canAct}
            onClick={() => {
              setMode("log");
              setError("");
            }}
          >
            Log
          </button>
        </div>
      )}

      {(mode === "log" || isEditing) && (
        <>
          <fieldset className="workout-log-field">
            <legend className="workout-log-label">Quality</legend>
            <div
              className="workout-quality-scale"
              role="group"
              aria-label="Workout quality 1 to 5"
            >
              {QUALITY_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`workout-quality-btn${quality === n ? " active" : ""}`}
                  onClick={() => setQuality(n)}
                  aria-pressed={quality === n}
                  aria-label={`Quality ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          {type === "run" && (
            <div className="workout-run-metrics">
              <label className="workout-log-field">
                <span className="workout-log-label">Miles</span>
                <input
                  className="workout-log-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  aria-label="Distance in miles"
                />
              </label>
              <label className="workout-log-field">
                <span className="workout-log-label">Min</span>
                <input
                  className="workout-log-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  placeholder="0"
                  value={runMin}
                  onChange={(e) => setRunMin(e.target.value)}
                  aria-label="Minutes"
                />
              </label>
              <label className="workout-log-field">
                <span className="workout-log-label">Sec</span>
                <input
                  className="workout-log-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  placeholder="0"
                  value={runSec}
                  onChange={(e) => setRunSec(e.target.value)}
                  aria-label="Seconds"
                />
              </label>
              {paceLabel && (
                <p className="workout-run-pace" aria-live="polite">
                  {paceLabel}
                </p>
              )}
            </div>
          )}

          {showSets && (
            <div className="workout-actuals">
              <p className="workout-log-label">Sets</p>
              {actuals.map((ex, ei) => (
                <div key={ex.exerciseId || `${ex.name}-${ei}`} className="workout-actual-ex">
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
                          min={0}
                          max={ex.repMode === "seconds" ? 999 : 99}
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(ei, si, { reps: e.target.value })
                          }
                          aria-label={`${ex.name} set ${si + 1} ${repModeLabel(ex.repMode).toLowerCase()}`}
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
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="workout-log-field">
            <span className="workout-log-label">Notes</span>
            <input
              className="workout-log-input"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes"
            />
          </label>

          <div className="workout-mode-actions">
            <button
              type="submit"
              className="btn primary"
              disabled={!canAct || quality == null}
            >
              {busy ? "Saving…" : isEditing ? "Save changes" : "Save"}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => {
                if (isEditing) {
                  resetFields();
                  onCancelEdit?.();
                  setError("");
                  return;
                }
                setMode("choose");
                setError("");
              }}
            >
              {isEditing ? "Cancel" : "Back"}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="tiny workout-log-error">{error}</p>
      )}
    </form>
  );
}
