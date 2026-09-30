"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import type { WorkoutRepMode, WorkoutRoutine, WorkoutType } from "@/lib/types";
import {
  knownExercises,
  normalizeRoutines,
  repModeLabel,
  WORKOUT_CUSTOM,
  WORKOUT_TYPES,
} from "@/lib/workouts";

type DraftExercise = {
  key: string;
  id?: string;
  name: string;
  sets: string;
  reps: string;
  repMode: WorkoutRepMode;
  tracksWeight: boolean;
};

function emptyExercise(): DraftExercise {
  return {
    key: `new_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    sets: "3",
    reps: "10",
    repMode: "reps",
    tracksWeight: false,
  };
}

function draftFromRoutine(r: WorkoutRoutine): {
  id: string;
  name: string;
  type: WorkoutType;
  exercises: DraftExercise[];
} {
  return {
    id: r.id,
    name: r.name,
    type: r.type!,
    exercises: r.exercises.map((ex) => ({
      key: ex.id,
      id: ex.id,
      name: ex.name,
      sets: String(ex.sets),
      reps: String(ex.reps),
      repMode: ex.repMode ?? "reps",
      tracksWeight: ex.tracksWeight,
    })),
  };
}

function exerciseSelectValue(
  name: string,
  knownNames: Set<string>,
): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (knownNames.has(trimmed.toLowerCase())) return trimmed;
  return WORKOUT_CUSTOM;
}

export function WorkoutRoutineBuilder() {
  const { state, post } = useApp();
  const routines = normalizeRoutines(state.workoutRoutines);
  const known = useMemo(
    () => knownExercises(state.workouts, state.workoutRoutines),
    [state.workouts, state.workoutRoutines],
  );
  const knownByLower = useMemo(() => {
    const map = new Map(known.map((k) => [k.name.toLowerCase(), k]));
    return map;
  }, [known]);
  const knownNameKeys = useMemo(
    () => new Set(known.map((k) => k.name.toLowerCase())),
    [known],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkoutType>("lift");
  const [exercises, setExercises] = useState<DraftExercise[]>([emptyExercise()]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("lift");
    setExercises([emptyExercise()]);
    setError("");
  }

  function startCreate() {
    resetForm();
    setOpen(true);
  }

  function startEdit(r: WorkoutRoutine) {
    const d = draftFromRoutine(r);
    setEditingId(d.id);
    setName(d.name);
    setType(d.type);
    setExercises(d.exercises.length ? d.exercises : [emptyExercise()]);
    setOpen(true);
    setError("");
  }

  function closeForm() {
    setOpen(false);
    resetForm();
  }

  function updateExercise(key: string, patch: Partial<DraftExercise>) {
    setExercises((prev) =>
      prev.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)),
    );
  }

  function pickExercise(key: string, value: string) {
    if (value === "" || value === WORKOUT_CUSTOM) {
      updateExercise(key, { name: "" });
      return;
    }
    const match = knownByLower.get(value.toLowerCase());
    if (!match) {
      updateExercise(key, { name: value });
      return;
    }
    updateExercise(key, {
      name: match.name,
      sets: String(match.sets),
      reps: String(match.reps),
      repMode: match.repMode,
      tracksWeight: match.tracksWeight,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const parsed = exercises
      .map((ex) => ({
        id: ex.id,
        name: ex.name.trim(),
        sets: Number(ex.sets),
        reps: Number(ex.reps),
        repMode: ex.repMode,
        tracksWeight: ex.tracksWeight,
      }))
      .filter((ex) => ex.name);
    if (!trimmed || parsed.length === 0) {
      setError("Name and at least one exercise required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/workouts", {
        action: "save_routine",
        id: editingId || undefined,
        name: trimmed,
        type,
        exercises: parsed,
      });
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save routine");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await post("/api/workouts", { action: "delete_routine", id });
      if (editingId === id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel workout-routine-panel">
      <div className="workout-routine-head">
        <p className="eyebrow" style={{ marginBottom: 0 }}>
          Create routine
        </p>
        {!open && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Create a routine"
            onClick={startCreate}
          >
            +
          </button>
        )}
      </div>

      {routines.length > 0 && !open && (
        <ul className="workout-routine-list">
          {routines.map((r) => (
            <li key={r.id} className="workout-routine-row">
              <button
                type="button"
                className="workout-routine-main"
                disabled={busy}
                onClick={() => startEdit(r)}
              >
                <span className="workout-history-line">
                  <span
                    className={`workout-history-dot ${r.type}`}
                    aria-hidden
                  />
                  {r.name}
                </span>
                <span className="workout-routine-meta tiny muted">
                  {r.exercises.length} exercise
                  {r.exercises.length === 1 ? "" : "s"}
                  {r.exercises.some((ex) => ex.repMode === "seconds")
                    ? " · timed"
                    : ""}
                  {r.exercises.some((ex) => ex.tracksWeight)
                    ? " · tracks weight"
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {routines.length === 0 && !open && (
        <p className="muted tiny workout-routine-empty">
          No saved routines yet. Tap + to create one.
        </p>
      )}

      {open && (
        <form
          className="workout-routine-form workout-log-form"
          onSubmit={save}
          autoComplete="off"
        >
          <label className="workout-log-field">
            <span className="workout-log-label">Routine name</span>
            <input
              className="workout-log-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning stretch"
              aria-label="Routine name"
              name="rebuild-routine-name"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </label>

          <fieldset className="workout-log-field">
            <legend className="workout-log-label">Type</legend>
            <div
              className="workout-type-segment workout-type-segment-compact"
              role="group"
              aria-label="Routine type"
            >
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

          <div className="workout-routine-exercises">
            <p className="workout-log-label">Exercises</p>
            {exercises.map((ex, i) => {
              const selectValue = exerciseSelectValue(ex.name, knownNameKeys);
              const showCustom =
                known.length === 0 || selectValue === WORKOUT_CUSTOM;
              return (
                <div key={ex.key} className="workout-routine-ex-card">
                  <div className="workout-routine-ex-head">
                    <span className="workout-log-label">Exercise {i + 1}</span>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        className="workout-routine-inline-btn"
                        onClick={() =>
                          setExercises((prev) =>
                            prev.filter((row) => row.key !== ex.key),
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {known.length > 0 ? (
                    <label className="workout-log-field">
                      <span className="workout-log-label">Name</span>
                      <select
                        className="workout-log-select"
                        value={
                          selectValue === WORKOUT_CUSTOM
                            ? WORKOUT_CUSTOM
                            : selectValue
                              ? knownByLower.get(selectValue.toLowerCase())
                                  ?.name ?? selectValue
                              : ""
                        }
                        onChange={(e) => pickExercise(ex.key, e.target.value)}
                        aria-label={`Exercise ${i + 1} name`}
                      >
                        <option value="">Choose…</option>
                        {known.map((k) => (
                          <option key={k.name} value={k.name}>
                            {k.name}
                          </option>
                        ))}
                        <option value={WORKOUT_CUSTOM}>Other…</option>
                      </select>
                    </label>
                  ) : null}
                  {showCustom && (
                    <label className="workout-log-field">
                      <span className="workout-log-label">
                        {known.length > 0 ? "Custom name" : "Name"}
                      </span>
                      <input
                        className="workout-log-input"
                        value={ex.name}
                        onChange={(e) =>
                          updateExercise(ex.key, { name: e.target.value })
                        }
                        placeholder="Exercise name"
                        aria-label={`Exercise ${i + 1} name`}
                        autoComplete="off"
                      />
                    </label>
                  )}
                  <div className="workout-routine-ex-metrics">
                    <label className="workout-routine-metric">
                      <span className="workout-log-label">Sets</span>
                      <input
                        className="workout-actual-input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={99}
                        value={ex.sets}
                        onChange={(e) =>
                          updateExercise(ex.key, { sets: e.target.value })
                        }
                        aria-label={`Exercise ${i + 1} sets`}
                      />
                    </label>
                    <div className="workout-routine-metric workout-routine-metric-grow">
                      <span className="workout-log-label">
                        {repModeLabel(ex.repMode)} each
                      </span>
                      <div className="workout-rep-mode-row">
                        <div
                          className="workout-rep-mode-segment"
                          role="group"
                          aria-label={`Exercise ${i + 1} rep mode`}
                        >
                          <button
                            type="button"
                            className={`workout-rep-mode-btn${ex.repMode === "reps" ? " active" : ""}`}
                            aria-pressed={ex.repMode === "reps"}
                            onClick={() =>
                              updateExercise(ex.key, { repMode: "reps" })
                            }
                          >
                            Reps
                          </button>
                          <button
                            type="button"
                            className={`workout-rep-mode-btn${ex.repMode === "seconds" ? " active" : ""}`}
                            aria-pressed={ex.repMode === "seconds"}
                            onClick={() =>
                              updateExercise(ex.key, { repMode: "seconds" })
                            }
                          >
                            Sec
                          </button>
                        </div>
                        <input
                          className="workout-actual-input workout-rep-mode-value"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={ex.repMode === "seconds" ? 999 : 99}
                          value={ex.reps}
                          onChange={(e) =>
                            updateExercise(ex.key, { reps: e.target.value })
                          }
                          aria-label={`Exercise ${i + 1} ${repModeLabel(ex.repMode).toLowerCase()}`}
                          placeholder={ex.repMode === "seconds" ? "30" : "10"}
                        />
                      </div>
                    </div>
                  </div>
                  <label className="workout-routine-weight-toggle">
                    <input
                      type="checkbox"
                      checked={ex.tracksWeight}
                      onChange={(e) =>
                        updateExercise(ex.key, {
                          tracksWeight: e.target.checked,
                        })
                      }
                    />
                    <span>Track weight</span>
                  </label>
                </div>
              );
            })}
            <button
              type="button"
              className="workout-routine-inline-btn"
              onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
            >
              + Add exercise
            </button>
          </div>

          <div className="workout-routine-form-actions">
            <button
              type="button"
              className="workout-routine-inline-btn"
              onClick={closeForm}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary workout-routine-save"
              disabled={busy}
            >
              {busy ? "Saving…" : editingId ? "Update routine" : "Save routine"}
            </button>
          </div>

          {editingId && (
            <button
              type="button"
              className="workout-routine-delete"
              disabled={busy}
              onClick={() => void remove(editingId)}
            >
              Delete routine
            </button>
          )}

          {error && <p className="tiny workout-log-error">{error}</p>}
        </form>
      )}
    </section>
  );
}
