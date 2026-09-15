"use client";

import {
  buildMonthGrid,
  monthLabel,
  parseMonthKey,
  shiftMonthKey,
} from "@/lib/workouts";

const DOW = ["S", "M", "T", "W", "T", "F", "S"] as const;

type Props = {
  monthKey: string;
  today: string;
  selectedDate: string;
  /** Up to a few hex colors per date (group bars under the day). */
  dayColors: Record<string, string[]>;
  onMonthChange: (key: string) => void;
  onSelectDate: (date: string) => void;
};

function isWeekendColumn(col: number): boolean {
  return col === 0 || col === 6;
}

export function AgendaMonthCalendar({
  monthKey,
  today,
  selectedDate,
  dayColors,
  onMonthChange,
  onSelectDate,
}: Props) {
  const { year, month } = parseMonthKey(monthKey);
  const weeks = buildMonthGrid(year, month);
  const title = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
  });

  return (
    <div className="agenda-month">
      <div className="agenda-month-nav">
        <button
          type="button"
          className="btn ghost agenda-month-arrow"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
        >
          ‹
        </button>
        <p className="agenda-month-title">
          {title}
          <span className="sr-only"> {monthLabel(year, month)}</span>
        </p>
        <button
          type="button"
          className="btn ghost agenda-month-arrow"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
        >
          ›
        </button>
      </div>

      <div className="agenda-month-dow" aria-hidden>
        {DOW.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className={isWeekendColumn(i) ? "weekend" : undefined}
          >
            {d}
          </span>
        ))}
      </div>

      <div className="agenda-month-grid" role="grid" aria-label={`${title} calendar`}>
        {weeks.flat().map((date, i) => {
          const col = i % 7;
          if (!date) {
            return (
              <div
                key={`pad-${i}`}
                className="agenda-month-cell empty"
                role="gridcell"
              />
            );
          }
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayNum = Number(date.slice(8));
          const colors = (dayColors[date] ?? []).slice(0, 4);
          const weekend = isWeekendColumn(col);

          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`agenda-month-cell${isToday ? " today" : ""}${
                isSelected ? " selected" : ""
              }${weekend ? " weekend" : ""}${colors.length ? " has-events" : ""}`}
              onClick={() => onSelectDate(date)}
              aria-label={`${date}${
                colors.length ? `, ${colors.length} calendar colors` : ""
              }`}
            >
              <span className="agenda-month-daynum">{dayNum}</span>
              <span className="agenda-month-bars" aria-hidden>
                {colors.map((c, idx) => (
                  <span
                    key={`${date}-${idx}`}
                    className="agenda-month-bar"
                    style={{ background: c }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
