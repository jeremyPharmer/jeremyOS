"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import {
  formatMiles,
  monthHistoryLabel,
  monthlyWorkoutHistory,
  monthWorkoutSummary,
  parseMonthKey,
  weekWorkoutSummary,
  WORKOUT_TYPES,
} from "@/lib/workouts";

function SummaryBlock({
  title,
  counts,
  runMiles,
  totalMinutes,
  qualityPoints,
  emphasizePoints,
}: {
  title: string;
  counts: Record<string, number>;
  runMiles: number;
  totalMinutes: number;
  qualityPoints: number;
  emphasizePoints?: boolean;
}) {
  const totalSessions = WORKOUT_TYPES.reduce(
    (sum, t) => sum + (counts[t.id] ?? 0),
    0,
  );

  return (
    <div className="workout-summary-block">
      <p className="eyebrow">{title}</p>
      {emphasizePoints && (
        <div className="workout-week-points">
          <span className="workout-week-points-value">{qualityPoints}</span>
          <span className="workout-week-points-label">
            point{qualityPoints === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="workout-summary-grid">
        {WORKOUT_TYPES.map((t) => (
          <div key={t.id} className={`workout-summary-stat ${t.id}`}>
            <span className="workout-summary-count">{counts[t.id] ?? 0}</span>
            <span className="workout-summary-label">{t.label}</span>
          </div>
        ))}
      </div>
      <div className="workout-summary-meta">
        {!emphasizePoints && (
          <span>
            {qualityPoints} pt{qualityPoints === 1 ? "" : "s"}
          </span>
        )}
        <span>{formatMiles(runMiles)} mi run</span>
        {totalMinutes > 0 && <span>{totalMinutes} min total</span>}
        {totalSessions > 0 && (
          <span>
            {totalSessions} session{totalSessions === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

function MonthPointsHistory({
  rows,
}: {
  rows: ReturnType<typeof monthlyWorkoutHistory>;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <div className="workout-month-history">
      <button
        type="button"
        className="workout-month-history-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        Month history
      </button>
      {open && (
        <div className="workout-month-history-table-wrap fade-in">
          <table className="workout-month-history-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                {WORKOUT_TYPES.map((t) => (
                  <th key={t.id} scope="col" className={t.id}>
                    {t.label}
                  </th>
                ))}
                <th scope="col" className="total">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.monthKey}>
                  <th scope="row">{monthHistoryLabel(row.year, row.month)}</th>
                  {WORKOUT_TYPES.map((t) => (
                    <td key={t.id} className={t.id}>
                      {row.countsByType[t.id]}
                    </td>
                  ))}
                  <td className="total">{row.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function WorkoutSummaryPanel({
  monthKey,
  today,
}: {
  monthKey: string;
  today: string;
}) {
  const { state } = useApp();
  const { year, month } = useMemo(
    () => parseMonthKey(monthKey),
    [monthKey],
  );

  const week = weekWorkoutSummary(state.workouts, today);
  const monthSummary = monthWorkoutSummary(state.workouts, year, month);
  const historyRows = useMemo(
    () => monthlyWorkoutHistory(state.workouts),
    [state.workouts],
  );

  return (
    <section className="panel workout-summary-panel">
      <p className="eyebrow">Summary</p>
      <div className="workout-summary-stack">
        <SummaryBlock
          title="This week"
          counts={week.counts}
          runMiles={week.runMiles}
          totalMinutes={week.totalMinutes}
          qualityPoints={week.qualityPoints}
          emphasizePoints
        />
        <SummaryBlock
          title="This month"
          counts={monthSummary.counts}
          runMiles={monthSummary.runMiles}
          totalMinutes={monthSummary.totalMinutes}
          qualityPoints={monthSummary.qualityPoints}
        />
        <MonthPointsHistory rows={historyRows} />
      </div>
    </section>
  );
}
