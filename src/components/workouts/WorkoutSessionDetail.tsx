import {
  formatDurationMinSec,
  formatMiles,
  formatPacePerMile,
  repModeLabel,
  workoutDurationSec,
  workoutTypeLabel,
} from "@/lib/workouts";
import type { WorkoutExerciseActual, WorkoutLog, WorkoutType } from "@/lib/types";
import { WorkoutActionsMenu } from "@/components/workouts/WorkoutActionsMenu";

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
  const durationSec = workoutDurationSec(workout);
  if (durationSec != null && durationSec > 0) {
    bits.push(formatDurationMinSec(durationSec));
  }
  if (workout.distanceMiles != null && workout.distanceMiles > 0) {
    bits.push(`${formatMiles(workout.distanceMiles)} mi`);
  }
  if (
    workout.type === "run" &&
    workout.distanceMiles != null &&
    durationSec != null
  ) {
    const pace = formatPacePerMile(workout.distanceMiles, durationSec);
    if (pace) bits.push(pace);
  }
  return bits;
}

export function WorkoutSessionDetail({
  workout,
  onEdit,
  onDelete,
}: {
  workout: WorkoutLog;
  onEdit?: (workout: WorkoutLog) => void;
  onDelete?: (id: string) => void | Promise<void>;
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
          {onEdit && onDelete && (
            <WorkoutActionsMenu
              label={workout.label}
              className="workout-session-menu"
              onEdit={() => onEdit(workout)}
              onDelete={() => onDelete(workout.id)}
            />
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
