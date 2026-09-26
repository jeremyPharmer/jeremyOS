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
import type { OnThisDayEvent } from "@/lib/on-this-day";
import {
  weatherDayFacts,
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

/** Single-day weather detail — today or tomorrow, no week strip. */
const DEFAULT_RADAR_HREF = "https://radar.weather.gov/";

export function WeatherExpanded({
  mode,
  locationLabel,
  days,
  focusDate,
  loading,
  showRadar = false,
  radarHref = DEFAULT_RADAR_HREF,
}: {
  mode: "today" | "tomorrow";
  locationLabel?: string;
  days: DailyForecast[];
  /** Date to highlight (today or tomorrow). */
  focusDate: string;
  loading?: boolean;
  /** External radar bounce-out (NWS). */
  showRadar?: boolean;
  radarHref?: string;
}) {
  const focus =
    days.find((d) => d.date === focusDate) ??
    (mode === "tomorrow" ? days[1] : days[0]);
  const facts = focus ? weatherDayFacts(focus) : [];

  return (
    <section
      className="daily-briefing-section daily-briefing-weather paper-card paper-weather"
      aria-label="Weather"
      id="weather"
    >
      <div className="open-river-sec-head">
        <p className="daily-briefing-kicker">
          {mode === "tomorrow" ? "Tomorrow" : "Today"}
        </p>
        {showRadar ? (
          <a
            className="open-river-jump"
            href={radarHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Radar →
          </a>
        ) : null}
      </div>
      {loading && !focus ? (
        <p className="muted tiny">Loading forecast…</p>
      ) : !focus ? (
        <p className="muted tiny">Forecast unavailable right now.</p>
      ) : (
        <>
          <div className="paper-weather-now">
            <span className="paper-weather-icon" aria-hidden>
              {focus.icon}
            </span>
            <div className="paper-weather-now-copy">
              <p className="paper-weather-condition">{focus.label}</p>
              {locationLabel ? (
                <p className="paper-weather-place">{locationLabel}</p>
              ) : null}
              <p className="paper-weather-temps">
                <span className="high">{focus.highF}°</span>
                <span className="low"> / {focus.lowF}°</span>
              </p>
            </div>
          </div>
          <dl className="paper-weather-facts">
            {facts.map((fact) => (
              <div key={fact.label} className="paper-weather-fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          {showRadar ? (
            <a
              className="open-river-radar"
              href={radarHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open radar →
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}

export function ThisDayInHistory({
  today,
  entries,
  worldEvent,
  worldLoading,
  hideWhenEmpty = false,
}: {
  today: string;
  entries: ThisDayHistoryEntry[];
  /** One world anniversary for this month-day. */
  worldEvent?: OnThisDayEvent | null;
  worldLoading?: boolean;
  /** Skip when no journal rows and no world event (and not loading). */
  hideWhenEmpty?: boolean;
}) {
  const hasJournal = entries.length > 0;
  const hasWorld = Boolean(worldEvent);
  if (
    hideWhenEmpty &&
    !hasJournal &&
    !hasWorld &&
    !worldLoading
  ) {
    return null;
  }

  return (
    <section
      className="daily-briefing-section daily-briefing-history paper-card paper-card-history"
      aria-label="On this date"
    >
      <p className="daily-briefing-kicker">{thisDayInHistoryTitle(today)}</p>

      {worldLoading && !hasWorld ? (
        <p className="muted tiny paper-card-loading">Looking up this date…</p>
      ) : hasWorld && worldEvent ? (
        <div className="paper-history-world">
          <p className="paper-history-world-label">Also on this date</p>
          <p className="paper-history-world-line">
            <span className="paper-history-world-year">{worldEvent.year}</span>
            {worldEvent.url ? (
              <a
                href={worldEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="paper-history-world-text"
              >
                {worldEvent.text}
              </a>
            ) : (
              <span className="paper-history-world-text">{worldEvent.text}</span>
            )}
          </p>
        </div>
      ) : null}

      {hasJournal ? (
        <>
          <p className="paper-history-journal-label">From your journal</p>
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
        </>
      ) : !worldLoading && !hasWorld ? (
        <p className="muted tiny">
          No journal entries for this date in past years yet.
        </p>
      ) : !hasJournal && hasWorld ? (
        <p className="paper-history-empty-journal muted tiny">
          No journal pages for this date yet — start one this evening.
        </p>
      ) : null}
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
  linkHref,
  linkLabel = "All →",
}: {
  tasks: BriefingTaskRow[];
  emptyLabel?: string;
  kicker?: string;
  /** Skip the whole section when there is nothing to show. */
  hideWhenEmpty?: boolean;
  linkHref?: string;
  linkLabel?: string;
}) {
  if (hideWhenEmpty && tasks.length === 0) return null;
  return (
    <section
      className="daily-briefing-section daily-briefing-tasks paper-card paper-card-tasks"
      aria-label={kicker}
      id="tasks"
    >
      <div className="open-river-sec-head">
        <p className="daily-briefing-kicker">{kicker}</p>
        {linkHref ? (
          <a className="open-river-jump" href={linkHref}>
            {linkLabel}
          </a>
        ) : null}
      </div>
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

function pulseDelta(delta: number | null): {
  tone: "up" | "down" | "even" | "none";
  label: string;
} {
  if (delta == null) return { tone: "none", label: "—" };
  if (delta === 0) return { tone: "even", label: "even" };
  if (delta > 0) return { tone: "up", label: "up" };
  return { tone: "down", label: "down" };
}

function pulseValue(
  today: number | null,
  weekAvg: number | null,
  opts?: { hours?: boolean },
): { display: string; caption: string } {
  const fmt = (n: number) =>
    opts?.hours
      ? Number.isInteger(n)
        ? `${n}h`
        : `${n.toFixed(1)}h`
      : Number.isInteger(n)
        ? String(n)
        : n.toFixed(1);
  if (today != null) {
    return {
      display: fmt(today),
      caption: weekAvg != null ? `wk ${fmt(weekAvg)}` : "today",
    };
  }
  if (weekAvg != null) {
    return { display: fmt(weekAvg), caption: "week avg" };
  }
  return { display: "—", caption: "no data" };
}

/** Check-in vs last week — mood, energy, stress, sleep hours + quality. */
export function BodyMind({
  workouts,
  trends,
}: {
  workouts: WorkoutGapInsight;
  trends: SevenDayTrendInsight;
}) {
  const rows: {
    key: string;
    label: string;
    today: number | null;
    avg: number | null;
    delta: number | null;
    hours?: boolean;
  }[] = [
    {
      key: "mood",
      label: "Mood",
      today: trends.todayMood,
      avg: trends.moodAvg,
      delta: trends.moodVsLastWeek,
    },
    {
      key: "energy",
      label: "Energy",
      today: trends.todayEnergy,
      avg: trends.energyAvg,
      delta: trends.energyVsLastWeek,
    },
    {
      key: "stress",
      label: "Stress",
      today: trends.todayStress,
      avg: trends.stressAvg,
      delta: trends.stressVsLastWeek,
    },
    {
      key: "sleep-hours",
      label: "Sleep",
      today: trends.todaySleepHours,
      avg: trends.sleepHoursAvg,
      delta: trends.sleepHoursVsLastWeek,
      hours: true,
    },
    {
      key: "sleep-quality",
      label: "Quality",
      today: trends.todaySleepQuality,
      avg: trends.sleepQualityAvg,
      delta: trends.sleepQualityVsLastWeek,
    },
  ];

  return (
    <section
      className="daily-briefing-section daily-briefing-bodymind paper-pulse paper-card paper-card-pulse"
      aria-label="Check-in versus last week"
    >
      <div className="paper-pulse-heading">
        <p className="daily-briefing-kicker">Check-in</p>
        <p className="paper-pulse-sub">Today vs last week</p>
      </div>
      <div className="paper-pulse-scoreboard" role="list">
        {rows.map((row) => {
          const value = pulseValue(row.today, row.avg, { hours: row.hours });
          const vs = pulseDelta(row.delta);
          return (
            <div key={row.key} className="paper-pulse-stat" role="listitem">
              <span className="paper-pulse-label">{row.label}</span>
              <span className="paper-pulse-value">{value.display}</span>
              <span className="paper-pulse-delta">
                {row.today != null && row.avg != null
                  ? `${vs.label} from ${value.caption}`
                  : value.caption}
              </span>
            </div>
          );
        })}
      </div>
      <p className="paper-pulse-workout">{workouts.anyLabel}</p>
    </section>
  );
}
