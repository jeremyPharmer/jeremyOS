"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { formatMonthDayYear, TASK_GROUP_COLORS } from "@/lib/task-groups";
import { todoAnalytics } from "@/lib/todo-stats";

function MonthlyBars({
  points,
}: {
  points: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="todo-stats-bars" role="img" aria-label="Completions by month">
      {points.map((p) => {
        const h = Math.round((p.count / max) * 100);
        return (
          <div key={p.label} className="todo-stats-bar-col">
            <div className="todo-stats-bar-track" aria-hidden>
              <div
                className="todo-stats-bar-fill"
                style={{ height: `${Math.max(p.count > 0 ? 8 : 0, h)}%` }}
              />
            </div>
            <span className="todo-stats-bar-count">{p.count}</span>
            <span className="todo-stats-bar-label">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TaskAnalyticsPanel() {
  const { state, today } = useApp();
  const [historyOpen, setHistoryOpen] = useState(false);
  const stats = useMemo(
    () => (today ? todoAnalytics(state, today) : null),
    [state, today],
  );

  if (!stats || !today) return null;

  const hasSignal = stats.completes + stats.snoozes > 0;

  return (
    <section className="panel todo-stats-panel" aria-label="Task analytics">
      <p className="eyebrow">Pulse</p>
      <h2 className="todo-stats-title">How you move through tasks</h2>

      {!hasSignal ? (
        <p className="muted" style={{ margin: 0 }}>
          Complete or snooze a few tasks — your % snoozed, monthly completions,
          and area mix show up here.
        </p>
      ) : (
        <>
          <div className="todo-stats-hero">
            <p className="todo-stats-pct">
              <span className="todo-stats-pct-num">
                {stats.snoozePercent != null ? `${stats.snoozePercent}%` : "—"}
              </span>
              <span className="todo-stats-pct-unit"> snoozed</span>
            </p>
            <p className="muted tiny" style={{ margin: 0 }}>
              {stats.snoozes} snooze · {stats.completes} complete
              {stats.undos > 0 ? ` · ${stats.undos} undo` : ""}
            </p>
          </div>

          <div className="todo-stats-block">
            <p className="todo-stats-block-label">Completed by month</p>
            <MonthlyBars points={stats.monthlyCompletes} />
          </div>

          <div className="todo-stats-block">
            <p className="todo-stats-block-label">Completed by area</p>
            <ul className="todo-stats-groups">
              {stats.byGroup.map((row) => (
                <li key={row.group} className="todo-stats-group-row">
                  <span
                    className="todo-stats-group-swatch"
                    style={{ background: TASK_GROUP_COLORS[row.group] }}
                    aria-hidden
                  />
                  <span className="todo-stats-group-name">{row.label}</span>
                  <span className="todo-stats-group-nums">
                    {row.completed}
                    {row.percent != null ? (
                      <span className="muted"> · {row.percent}%</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="todo-stats-block">
            <button
              type="button"
              className="todo-stats-history-toggle"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen ? "Hide history" : "Completed history"}
            </button>
            {historyOpen && (
              <ul className="todo-stats-history">
                {stats.history.length === 0 ? (
                  <li className="muted tiny">Nothing logged yet.</li>
                ) : (
                  stats.history.map((row) => (
                    <li key={row.id} className="todo-stats-history-row">
                      <span className="todo-stats-history-action">
                        {row.action === "complete"
                          ? "Done"
                          : row.action === "snooze"
                            ? "Snooze"
                            : "Undo"}
                      </span>
                      <span className="todo-stats-history-label">{row.label}</span>
                      <span className="muted tiny">
                        {formatMonthDayYear(row.date)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
