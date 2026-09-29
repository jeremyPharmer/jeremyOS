"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import type { ActiveWorkoutSession, WorkoutExerciseActual } from "@/lib/types";
import {
  activeWorkoutElapsedMs,
  elapsedDurationMin,
  formatElapsedClock,
  gymSupportForType,
  repModeLabel,
  workoutTypeLabel,
  WORKOUT_QUALITY_MAX,
} from "@/lib/workouts";

const QUALITY_OPTIONS = Array.from(
  { length: WORKOUT_QUALITY_MAX },
  (_, i) => i + 1,
);

function sanitizeActuals(
  actuals: WorkoutExerciseActual[],
): WorkoutExerciseActual[] | undefined {
  if (!actuals.length) return undefined;
  const cleaned = actuals
    .map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      tracksWeight: ex.tracksWeight,
      repMode: ex.repMode,
      sets: ex.sets
        .filter((s) => s.reps > 0)
        .map((s) =>
          ex.tracksWeight
            ? { reps: s.reps, weight: s.weight }
            : { reps: s.reps },
        ),
    }))
    .filter((ex) => ex.sets.length > 0);
  return cleaned.length ? cleaned : undefined;
}

export function ActiveWorkoutPanel({
  session,
  onEnded,
}: {
  session: ActiveWorkoutSession;
  onEnded?: () => void;
}) {
  const { post } = useApp();
  const [elapsedMs, setElapsedMs] = useState(() =>
    activeWorkoutElapsedMs(session.startedAt),
  );
  const [actuals, setActuals] = useState<WorkoutExerciseActual[]>(
    session.exerciseActuals ?? [],
  );
  const [distance, setDistance] = useState(
    session.distanceMiles != null ? String(session.distanceMiles) : "",
  );
  const [notes, setNotes] = useState(session.notes ?? "");
  const [ending, setEnding] = useState(false);
  const [quality, setQuality] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock from startedAt — survives backgrounding (recompute on tick + focus)
  useEffect(() => {
    function tick() {
      setElapsedMs(activeWorkoutElapsedMs(session.startedAt));
    }
    tick();
    const id = window.setInterval(tick, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, [session.startedAt]);

  // Hydrate local draft when resuming a (possibly different) session
  useEffect(() => {
    setActuals(session.exerciseActuals ?? []);
    setDistance(
      session.distanceMiles != null ? String(session.distanceMiles) : "",
    );
    setNotes(session.notes ?? "");
    setEnding(false);
    setQuality(null);
  }, [session.id]);

  function schedulePersist(next: {
    actuals: WorkoutExerciseActual[];
    distance: string;
    notes: string;
  }) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void post("/api/workouts", {
        action: "update_session",
        exerciseActuals: sanitizeActuals(next.actuals),
        distanceMiles:
          session.type === "run" && next.distance
            ? Number(next.distance)
            : undefined,
        notes: next.notes.trim() || undefined,
      }).catch(() => {
        /* keep local draft; next edit retries */
      });
    }, 450);
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    patch: { reps?: string; weight?: string },
  ) {
    setActuals((prev) => {
      const next = prev.map((ex, ei) => {
        if (ei !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIndex) return s;
            const row = { ...s };
            if (patch.reps != null) {
              const n = Number(patch.reps);
              row.reps = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
            }
            if (patch.weight != null && ex.tracksWeight) {
              const n = Number(patch.weight);
              row.weight =
                patch.weight === "" || !Number.isFinite(n) ? undefined : n;
            }
            return row;
          }),
        };
      });
      schedulePersist({ actuals: next, distance, notes });
      return next;
    });
  }

  async function discard() {
    if (busy) return;
    if (!window.confirm("Discard this workout? The timer will be cleared.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/workouts", { action: "discard_session" });
      onEnded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard");
    } finally {
      setBusy(false);
    }
  }

  async function endWorkout() {
    if (quality == null || busy) return;
    setBusy(true);
    setError("");
    try {
      const durationMin = elapsedDurationMin(elapsedMs);
      await post("/api/workouts", {
        action: "end_session",
        quality,
        durationMin: durationMin > 0 ? durationMin : undefined,
        exerciseActuals: sanitizeActuals(actuals),
        distanceMiles:
          session.type === "run" && distance ? Number(distance) : undefined,
        notes: notes.trim() || undefined,
      });
      if (gymSupportForType(session.type)) {
        await post("/api/support", {
          date: session.date,
          supportType: "gym",
          completed: true,
        });
      }
      onEnded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end workout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel workout-active-panel fade-in">
      <div className="workout-active-head">
        <p className="eyebrow">In progress</p>
        <p className="workout-active-timer" aria-live="polite">
          {formatElapsedClock(elapsedMs)}
        </p>
        <p className="workout-active-title">
          <span className={`workout-day-badge ${session.type}`}>
            {workoutTypeLabel(session.type)}
          </span>
          {session.label}
        </p>
        <p className="tiny muted workout-active-hint">
          Switch apps anytime — this session stays until you end it.
        </p>
      </div>

      {actuals.length > 0 && (
        <div className="workout-actuals">
          <p className="workout-log-label">Today&apos;s sets</p>
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

      {session.type === "run" && (
        <label className="workout-log-field">
          <span className="workout-log-label">Miles</span>
          <input
            className="workout-log-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            placeholder="0.0"
            value={distance}
            onChange={(e) => {
              const v = e.target.value;
              setDistance(v);
              schedulePersist({ actuals, distance: v, notes });
            }}
            aria-label="Distance in miles"
          />
        </label>
      )}

      <label className="workout-log-field">
        <span className="workout-log-label">Notes</span>
        <input
          className="workout-log-input"
          placeholder="Optional"
          value={notes}
          onChange={(e) => {
            const v = e.target.value;
            setNotes(v);
            schedulePersist({ actuals, distance, notes: v });
          }}
          aria-label="Notes"
        />
      </label>

      {!ending ? (
        <div className="workout-active-actions">
          <button
            type="button"
            className="btn primary workout-log-submit"
            onClick={() => setEnding(true)}
            disabled={busy}
          >
            End workout
          </button>
          <button
            type="button"
            className="btn ghost workout-active-discard"
            onClick={() => void discard()}
            disabled={busy}
          >
            Discard
          </button>
        </div>
      ) : (
        <div className="workout-active-end fade-in">
          <fieldset className="workout-log-field">
            <legend className="workout-log-label">How was it? (required)</legend>
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
          <p className="tiny muted">
            Time logged: {formatElapsedClock(elapsedMs)}
            {elapsedDurationMin(elapsedMs) > 0
              ? ` · ${elapsedDurationMin(elapsedMs)} min`
              : ""}
          </p>
          <div className="workout-active-actions">
            <button
              type="button"
              className="btn primary workout-log-submit"
              disabled={quality == null || busy}
              onClick={() => void endWorkout()}
            >
              {busy ? "Saving…" : "Save workout"}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => {
                setEnding(false);
                setQuality(null);
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && <p className="tiny workout-log-error">{error}</p>}
    </section>
  );
}
