"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { WorkoutCalendar } from "@/components/workouts/WorkoutCalendar";
import {
  activeWorkoutElapsedMs,
  formatElapsedClock,
  formatMiles,
  monthKey,
  monthWorkoutSummary,
  parseMonthKey,
  workoutTypeLabel,
} from "@/lib/workouts";
import { parseDate } from "@/lib/journey";

export function MoveHubCard() {
  const { state, today } = useApp();
  const initialMonth = useMemo(() => {
    const d = parseDate(today);
    return monthKey(d.getFullYear(), d.getMonth() + 1);
  }, [today]);
  const [month, setMonth] = useState(initialMonth);
  const { year, month: monthNum } = parseMonthKey(month);
  const period = monthWorkoutSummary(state.workouts, year, monthNum);
  const isCurrentMonth = month === initialMonth;
  const active = state.activeWorkout ?? null;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    function tick() {
      setElapsedMs(activeWorkoutElapsedMs(active!.startedAt));
    }
    tick();
    const id = window.setInterval(tick, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  return (
    <section className="home-card home-card-move">
      <div className="home-card-head">
        <p className="home-card-kicker">Move</p>
        <h2>Workouts</h2>
        <p className="tiny home-card-sub">
          {period.qualityPoints} pt{isCurrentMonth ? " this month" : ""}
          {period.runMiles > 0 ? ` · ${formatMiles(period.runMiles)} mi` : ""}
        </p>
      </div>

      {active && (
        <Link href="/workouts" className="workout-active-resume fade-in">
          <span className="workout-active-resume-live" aria-hidden />
          <span className="workout-active-resume-copy">
            <strong>{active.label}</strong>
            <span className="tiny muted">
              {workoutTypeLabel(active.type)} · resume
            </span>
          </span>
          <span className="workout-active-resume-clock">
            {formatElapsedClock(elapsedMs)}
          </span>
        </Link>
      )}

      <WorkoutCalendar
        monthKey={month}
        today={today}
        workouts={state.workouts}
        compact
        onMonthChange={setMonth}
      />

      <Link href="/workouts" className="btn ghost workout-open-link">
        {active ? "Resume workout →" : "Open workouts →"}
      </Link>
    </section>
  );
}
