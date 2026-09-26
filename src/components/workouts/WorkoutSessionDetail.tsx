import {
  formatMiles,
  repModeLabel,
  workoutTypeLabel,
} from "@/lib/workouts";
import type { WorkoutExerciseActual, WorkoutLog, WorkoutType } from "@/lib/types";

function formatSetLine(ex: WorkoutExerciseActual): string {
  const unit = ex.repMode === "seconds" ? "s" : "";
  return ex.sets
    .map((s) => {
      if (ex.tracksWeight && s.weight != null) {
        return `${s.reps}${unit}×${s.weight}`;
      }
      return `${s.reps}${unit}`;
    })
    .join(" · ");
}

function metaBits(workout: WorkoutLog): string[] {
  const bits: string[] = [];
  if (workout.quality != null) bits.push(`${workout.quality}/5`);
  if (workout.durationMin != null && workout.durationMin > 0) {
    bits.push(`${workout.durationMin} min`);
  }
  if (workout.distanceMiles != null && workout.distanceMiles > 0) {
    bits.push(`${formatMiles(workout.distanceMiles)} mi`);
  }
  return bits;
}

export function WorkoutSessionDetail({
  workout,
  onDelete,
}: {
  workout: WorkoutLog;
  onDelete?: (id: string) => void;
}) {
  const type = (workout.type ?? "lift") as WorkoutType;
  const meta = metaBits(workout);
  const exercises = workout.exerciseActuals ?? [];

  return (
    <article className={`workout-session-detail ${type}`}>
      <header className="workout-session-head">
        <div className="workout-session-title-row">
          <span className={`workout-day-badge ${type}`}>
            {workoutTypeLabel(type)}
          </span>
          <h3 className="workout-session-label">{workout.label}</h3>
          {onDelete && (
            <button
              type="button"
              className="workout-history-remove workout-session-remove"
              aria-label={`Delete ${workout.label}`}
              onClick={() => onDelete(workout.id)}
            >
              ×
            </button>
          )}
        </div>
        {meta.length > 0 && (
          <p className="workout-session-meta">{meta.join(" · ")}</p>
        )}
      </header>

      {exercises.length > 0 && (
        <ul className="workout-session-exercises">
          {exercises.map((ex) => (
            <li key={ex.exerciseId || ex.name} className="workout-session-ex">
              <span className="workout-session-ex-name">{ex.name}</span>
              <span className="workout-session-ex-sets" title={repModeLabel(ex.repMode)}>
                {formatSetLine(ex)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {workout.notes?.trim() ? (
        <p className="workout-session-notes">{workout.notes.trim()}</p>
      ) : null}

      {exercises.length === 0 &&
        !workout.notes?.trim() &&
        meta.length === 0 && (
          <p className="muted tiny workout-session-empty">No session details logged.</p>
        )}
    </article>
  );
}
