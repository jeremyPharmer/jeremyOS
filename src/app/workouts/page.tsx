"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { WorkoutActionsMenu } from "@/components/workouts/WorkoutActionsMenu";
import { WorkoutCalendar } from "@/components/workouts/WorkoutCalendar";
import { WorkoutLogForm } from "@/components/workouts/WorkoutLogForm";
import { WorkoutRoutineBuilder } from "@/components/workouts/WorkoutRoutineBuilder";
import { WorkoutSessionDetail } from "@/components/workouts/WorkoutSessionDetail";
import { WorkoutSummaryPanel } from "@/components/workouts/WorkoutSummaryPanel";
import {
  formatWorkoutListDate,
  monthKey,
  workoutsForDate,
  workoutsInMonth,
} from "@/lib/workouts";
import { parseDate } from "@/lib/journey";
import type { WorkoutLog, WorkoutType } from "@/lib/types";

export default function WorkoutsPage() {
  const { state, today, post } = useApp();
  const initialMonth = useMemo(() => {
    const d = parseDate(today);
    return monthKey(d.getFullYear(), d.getMonth() + 1);
  }, [today]);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);

  const monthWorkouts = workoutsInMonth(state.workouts, month);
  const selectedDayWorkouts = workoutsForDate(state.workouts, selectedDate);
  const dayPanelOpen = selectedDayWorkouts.length > 0;

  async function deleteWorkout(id: string) {
    await post("/api/workouts", { action: "delete", id });
    if (editingWorkout?.id === id) setEditingWorkout(null);
  }

  function startEdit(workout: WorkoutLog) {
    setSelectedDate(workout.date);
    setEditingWorkout(workout);
  }

  return (
    <main className="fade-in stack workouts-page">
      <header className="workouts-header">
        <h1>Move</h1>
      </header>

      <WorkoutSummaryPanel monthKey={month} today={today} />

      <WorkoutLogForm
        date={selectedDate ?? today}
        editingWorkout={editingWorkout}
        onCancelEdit={() => setEditingWorkout(null)}
        onLogged={() => setEditingWorkout(null)}
      />

      <section className="panel workout-calendar-panel">
        <WorkoutCalendar
          monthKey={month}
          today={today}
          workouts={state.workouts}
          selectedDate={selectedDate}
          onMonthChange={setMonth}
          onSelectDate={setSelectedDate}
        />

        {dayPanelOpen && (
          <div className="workout-day-expand fade-in" aria-live="polite">
            <p className="workout-day-expand-label">
              {formatWorkoutListDate(selectedDate)}
              <span className="muted">
                {" "}
                · {selectedDayWorkouts.length} session
                {selectedDayWorkouts.length === 1 ? "" : "s"}
              </span>
            </p>
            <div className="workout-day-expand-list">
              {selectedDayWorkouts.map((w) => (
                <WorkoutSessionDetail
                  key={w.id}
                  workout={w}
                  onEdit={startEdit}
                  onDelete={(id) => deleteWorkout(id)}
                />
              ))}
            </div>
          </div>
        )}

        {monthWorkouts.length === 0 ? (
          <p className="muted tiny workout-history-empty">
            No workouts logged this month.
          </p>
        ) : (
          <ul className="workout-history-list">
            {monthWorkouts.map((w) => (
              <li
                key={w.id}
                className={`workout-history-row${w.date === selectedDate ? " selected" : ""}`}
              >
                <button
                  type="button"
                  className="workout-history-main"
                  onClick={() => setSelectedDate(w.date)}
                >
                  <span className="workout-history-line">
                    <span className="workout-history-date">
                      {formatWorkoutListDate(w.date)}:
                    </span>{" "}
                    <span
                      className={`workout-history-dot ${w.type as WorkoutType}`}
                      aria-hidden
                    />
                    {w.label}
                  </span>
                </button>
                <WorkoutActionsMenu
                  label={w.label}
                  onEdit={() => startEdit(w)}
                  onDelete={() => deleteWorkout(w.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <WorkoutRoutineBuilder />
    </main>
  );
}
