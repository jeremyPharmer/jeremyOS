"use client";

import {
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
  TASK_GROUPS,
  type TaskGroup,
} from "@/lib/task-groups";
import {
  buildMonthGrid,
  monthLabel,
  parseMonthKey,
  shiftMonthKey,
} from "@/lib/workouts";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  monthKey: string;
  today: string;
  selectedDate: string;
  /** Unique group colors per due date (task calendar dots). */
  dayColors: Record<string, string[]>;
  onMonthChange: (key: string) => void;
  onSelectDate: (date: string) => void;
};

export function TaskMonthCalendar({
  monthKey,
  today,
  selectedDate,
  dayColors,
  onMonthChange,
  onSelectDate,
}: Props) {
  const { year, month } = parseMonthKey(monthKey);
  const weeks = buildMonthGrid(year, month);

  return (
    <div className="workout-cal task-month-cal">
      <div className="workout-cal-nav">
        <button
          type="button"
          className="btn ghost workout-cal-arrow"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
        >
          ‹
        </button>
        <p className="workout-cal-title">{monthLabel(year, month)}</p>
        <button
          type="button"
          className="btn ghost workout-cal-arrow"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
        >
          ›
        </button>
      </div>

      <div className="workout-cal-dow">
        {DOW.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="workout-cal-grid" role="grid" aria-label="Task due dates">
        {weeks.flat().map((date, i) => {
          if (!date) {
            return <div key={`pad-${i}`} className="workout-cal-cell empty" />;
          }
          const colors = (dayColors[date] ?? []).slice(0, 4);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayNum = Number(date.slice(8));

          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`workout-cal-cell${isToday ? " today" : ""}${
                isSelected ? " selected" : ""
              }${colors.length ? " has-work" : ""}`}
              onClick={() => onSelectDate(date)}
              aria-label={`${date}${
                colors.length ? `, ${colors.length} task groups due` : ""
              }`}
            >
              <span className="workout-cal-daynum">{dayNum}</span>
              <span className="workout-cal-markers" aria-hidden>
                {colors.map((c) => (
                  <span
                    key={`${date}-${c}`}
                    className="workout-marker"
                    style={{ background: c }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="workout-cal-legend">
        {TASK_GROUPS.map((g: TaskGroup) => (
          <span key={g}>
            <span
              className="workout-marker"
              style={{ background: TASK_GROUP_COLORS[g] }}
            />{" "}
            {TASK_GROUP_LABELS[g]}
          </span>
        ))}
      </div>
    </div>
  );
}
