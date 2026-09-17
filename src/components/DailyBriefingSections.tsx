"use client";

import {
  historyExcerpt,
  thisDayInHistoryTitle,
  type SevenDayTrendInsight,
  type ThisDayHistoryEntry,
  type WorkoutGapInsight,
} from "@/lib/briefing";
import {
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
  type TaskGroup,
} from "@/lib/task-groups";
import type { NewsHeadline } from "@/lib/news";
import {
  dayAbbrev,
  weatherDetailNote,
  type DailyForecast,
} from "@/lib/weather";

export type BriefingTaskRow = {
  id: string;
  label: string;
  group?: TaskGroup;
  time?: string;
  meta?: string;
  /** When set, show Done / Open status (evening twin). */
  status?: "done" | "open";
};

function formatTodoTime(time: string): string {
  const [hRaw, m] = time.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m ?? "00"} ${suffix}`;
}

function taskGroupOf(group?: TaskGroup): TaskGroup {
  return group ?? "home";
}

/** Expanded weather — today + multi-day context, or tomorrow-only detail. */
export function WeatherExpanded({
  mode,
  locationLabel,
  days,
  focusDate,
  loading,
}: {
  mode: "today" | "tomorrow";
  locationLabel?: string;
  days: DailyForecast[];
  /** Date to highlight (today or tomorrow). */
  focusDate: string;
  loading?: boolean;
}) {
  const focus =
    days.find((d) => d.date === focusDate) ??
    (mode === "tomorrow" ? days[1] : days[0]);
  const contextDays =
    mode === "today"
      ? days.filter((d) => d.date !== focus?.date).slice(0, 4)
      : [];

  return (
    <section
      className="daily-briefing-section daily-briefing-weather daily-briefing-weather-expanded"
      aria-label="Weather"
    >
      <p className="daily-briefing-kicker">
        {mode === "tomorrow" ? "Tomorrow's forecast" : "Forecast"}
      </p>
      {loading && !focus ? (
        <p className="muted tiny">Loading forecast…</p>
      ) : !focus ? (
        <p className="muted tiny">Forecast unavailable right now.</p>
      ) : (
        <>
          {locationLabel ? (
            <p className="daily-briefing-weather-loc">{locationLabel}</p>
          ) : null}
          <div className="daily-briefing-weather-hero">
            <span className="daily-briefing-weather-icon" aria-hidden>
              {focus.icon}
            </span>
            <div className="daily-briefing-weather-hero-copy">
              <p className="daily-briefing-weather-label">{focus.label}</p>
              <p className="daily-briefing-weather-temps">
                <span className="high">{focus.highF}°</span>
                <span className="low">{focus.lowF}°</span>
              </p>
              <p className="daily-briefing-weather-note">
                {weatherDetailNote(focus)}
              </p>
            </div>
          </div>
          {contextDays.length > 0 ? (
            <div
              className="daily-briefing-weather-context"
              aria-label="Coming days"
            >
              {contextDays.map((day) => (
                <div key={day.date} className="daily-briefing-weather-chip">
                  <span className="dow">{dayAbbrev(day.date)}</span>
                  <span className="icon" aria-hidden>
                    {day.icon}
                  </span>
                  <span className="temps">
                    {day.highF}° / {day.lowF}°
                  </span>
                  <span className="precip">
                    {day.precipChancePct > 0
                      ? `${day.precipChancePct}%`
                      : "Dry"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function ThisDayInHistory({
  today,
  entries,
  hideWhenEmpty = false,
}: {
  today: string;
  entries: ThisDayHistoryEntry[];
  /** Skip the whole section when there are no past entries. */
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && entries.length === 0) return null;
  return (
    <section
      className="daily-briefing-section daily-briefing-history"
      aria-label="On this date"
    >
      <p className="daily-briefing-kicker">{thisDayInHistoryTitle(today)}</p>
      {entries.length === 0 ? (
        <p className="muted tiny">
          No journal entries for this date in past years yet.
        </p>
      ) : (
        <ol className="daily-briefing-history-timeline">
          {entries.map((entry) => (
            <li key={entry.date} className="daily-briefing-history-item">
              <span className="daily-briefing-history-year">{entry.year}</span>
              <div className="daily-briefing-history-body">
                {entry.headline ? (
                  <p className="daily-briefing-history-headline">
                    {entry.headline}
                  </p>
                ) : null}
                {entry.summary?.trim() ? (
                  <p className="daily-briefing-history-excerpt">
                    {historyExcerpt(entry)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function WorldHeadlines({
  headlines,
  loading,
  hideWhenEmpty = false,
}: {
  headlines: NewsHeadline[];
  loading?: boolean;
  /** Skip the section when there is nothing to show (and not loading). */
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && !loading && headlines.length === 0) return null;
  return (
    <section
      className="daily-briefing-section daily-briefing-news"
      aria-label="Headlines"
    >
      <p className="daily-briefing-kicker">World</p>
      {loading && headlines.length === 0 ? (
        <p className="muted tiny">Gathering headlines…</p>
      ) : headlines.length === 0 ? (
        <p className="muted tiny">
          News feed unavailable right now — try again later.
        </p>
      ) : (
        <ul className="daily-briefing-news-list">
          {headlines.map((h) => (
            <li key={`${h.source}-${h.title}`}>
              {h.url ? (
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="daily-briefing-news-link"
                >
                  {h.title}
                </a>
              ) : (
                <span className="daily-briefing-news-title">{h.title}</span>
              )}
              <span className="daily-briefing-news-source">{h.source}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Expanded task rows — due today only, no checkboxes (RB-032). */
export function BriefingTasks({
  tasks,
  emptyLabel = "Nothing due today.",
  kicker = "Planned tasks",
  hideWhenEmpty = false,
}: {
  tasks: BriefingTaskRow[];
  emptyLabel?: string;
  kicker?: string;
  /** Skip the whole section when there is nothing to show. */
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && tasks.length === 0) return null;
  return (
    <section
      className="daily-briefing-section daily-briefing-tasks"
      aria-label={kicker}
    >
      <p className="daily-briefing-kicker">{kicker}</p>
      {tasks.length === 0 ? (
        <p className="muted tiny">{emptyLabel}</p>
      ) : (
        <ul className="daily-briefing-task-list">
          {tasks.map((t) => {
            const group = taskGroupOf(t.group);
            const metaBits = [
              t.time ? formatTodoTime(t.time) : null,
              t.meta,
              TASK_GROUP_LABELS[group],
            ].filter(Boolean);
            return (
              <li
                key={t.id}
                className="daily-briefing-task-row"
                style={{
                  ["--group-color" as string]: TASK_GROUP_COLORS[group],
                }}
              >
                <span className="daily-briefing-task-bar" aria-hidden />
                <div className="daily-briefing-task-body">
                  <span className="daily-briefing-task-title">{t.label}</span>
                  {metaBits.length > 0 ? (
                    <span className="daily-briefing-task-meta">
                      {metaBits.join(" · ")}
                    </span>
                  ) : null}
                </div>
                {t.status ? (
                  <span
                    className={`daily-briefing-task-status daily-briefing-task-status-${t.status}`}
                  >
                    {t.status === "done" ? "Done" : "Open"}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Newspaper timetable — time left, title right (Option A). */
export function PaperTimetable({
  rows,
}: {
  rows: { when: string; title: string; muted?: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <ul className="paper-timetable">
      {rows.map((row, i) => (
        <li
          key={`${row.when}-${row.title}-${i}`}
          className={
            row.muted
              ? "paper-timetable-row paper-timetable-row-muted"
              : "paper-timetable-row"
          }
        >
          {row.when ? (
            <span className="paper-timetable-when">{row.when}</span>
          ) : (
            <span className="paper-timetable-when" aria-hidden />
          )}
          <span className="paper-timetable-title">{row.title}</span>
        </li>
      ))}
    </ul>
  );
}

export function BodyMind({
  workouts,
  trends,
}: {
  workouts: WorkoutGapInsight;
  trends: SevenDayTrendInsight;
}) {
  return (
    <section
      className="daily-briefing-section daily-briefing-bodymind"
      aria-label="The last week"
    >
      <p className="daily-briefing-kicker">The last week</p>
      <div className="daily-briefing-bodymind-block">
        {trends.lines.map((line) => (
          <p key={line} className="daily-briefing-bodymind-line">
            {line}
          </p>
        ))}
        <p className="daily-briefing-bodymind-line">{workouts.anyLabel}</p>
      </div>
    </section>
  );
}
