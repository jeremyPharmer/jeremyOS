"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import type { ActiveWorkoutSession, WorkoutExerciseActual } from "@/lib/types";
import {
  activeWorkoutElapsedMs,
  durationSecFromParts,
  formatElapsedClock,
  formatPacePerMile,
  gymSupportForType,
  repModeLabel,
  splitDurationSec,
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
  const cleaned = actuals.map((ex) => ({
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
  return cleaned.length ? cleaned : undefined;
}

function parseNonNeg(raw: string): number {
  if (raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  const [runMin, setRunMin] = useState("");
  const [runSec, setRunSec] = useState("");
  const [timeDirty, setTimeDirty] = useState(
    () => session.durationSec != null && session.durationSec > 0,
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
    if (session.durationSec != null && session.durationSec > 0) {
      const parts = splitDurationSec(session.durationSec);
      setRunMin(String(parts.min));
      setRunSec(String(parts.sec));
      setTimeDirty(true);
    } else {
      setTimeDirty(false);
      const parts = splitDurationSec(
        Math.floor(activeWorkoutElapsedMs(session.startedAt) / 1000),
      );
      setRunMin(String(parts.min));
      setRunSec(String(parts.sec));
    }
  }, [session.id]);

  // Keep min/sec in sync with timer until the user edits them
  useEffect(() => {
    if (session.type !== "run" || timeDirty) return;
    const parts = splitDurationSec(Math.floor(elapsedMs / 1000));
    setRunMin(String(parts.min));
    setRunSec(String(parts.sec));
  }, [elapsedMs, timeDirty, session.type]);

  const runDurationSec = useMemo(() => {
    if (session.type !== "run") {
      return Math.floor(elapsedMs / 1000);
    }
    return durationSecFromParts(parseNonNeg(runMin), parseNonNeg(runSec));
  }, [session.type, elapsedMs, runMin, runSec]);

  const paceLabel = useMemo(() => {
    if (session.type !== "run") return null;
    const miles = Number(distance);
    return formatPacePerMile(miles, runDurationSec);
  }, [session.type, distance, runDurationSec]);

  function schedulePersist(next: {
    actuals: WorkoutExerciseActual[];
    distance: string;
    notes: string;
    durationSec?: number;
    persistDuration?: boolean;
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
        durationSec:
          next.persistDuration && next.durationSec != null && next.durationSec > 0
            ? next.durationSec
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
              row.reps =
                Number.isFinite(n) && n >= 0 ? Math.min(99, Math.round(n)) : 0;
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

  function onRunTimeChange(field: "min" | "sec", value: string) {
    setTimeDirty(true);
    const nextMin = field === "min" ? value : runMin;
    const nextSec = field === "sec" ? value : runSec;
    if (field === "min") setRunMin(value);
    else setRunSec(value);
    const sec = durationSecFromParts(
      parseNonNeg(nextMin),
      parseNonNeg(nextSec),
    );
    schedulePersist({
      actuals,
      distance,
      notes,
      durationSec: sec,
      persistDuration: true,
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
      const durationSec =
        session.type === "run"
          ? runDurationSec
          : Math.floor(elapsedMs / 1000);
      await post("/api/workouts", {
        action: "end_session",
        quality,
        durationSec: durationSec > 0 ? durationSec : undefined,
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

      {session.type === "run" && (
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
              onChange={(e) => {
                const v = e.target.value;
                setDistance(v);
                schedulePersist({
                  actuals,
                  distance: v,
                  notes,
                  durationSec: timeDirty ? runDurationSec : undefined,
                  persistDuration: timeDirty,
                });
              }}
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
              onChange={(e) => onRunTimeChange("min", e.target.value)}
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
              onChange={(e) => onRunTimeChange("sec", e.target.value)}
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

      <label className="workout-log-field">
        <span className="workout-log-label">Notes</span>
        <input
          className="workout-log-input"
          placeholder="Optional"
          value={notes}
          onChange={(e) => {
            const v = e.target.value;
            setNotes(v);
            schedulePersist({
              actuals,
              distance,
              notes: v,
              durationSec: timeDirty ? runDurationSec : undefined,
              persistDuration: timeDirty,
            });
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
          {session.type === "run" && paceLabel && (
            <p className="tiny muted">{paceLabel}</p>
          )}
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
