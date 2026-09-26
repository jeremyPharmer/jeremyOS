"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "./open-modern-samples.css";

const SAMPLES = [
  {
    id: "01-bento-dawn",
    name: "1 · Bento dawn",
    blurb: "Asymmetric tile grid. Commitment spans wide; weather + tasks as peer tiles.",
    weather: "internal+radar",
  },
  {
    id: "02-focus-first",
    name: "2 · Focus first",
    blurb: "Commitment owns the viewport. Everything else fades in as soft sections.",
    weather: "internal",
  },
  {
    id: "03-weather-dock",
    name: "3 · Weather dock",
    blurb: "Today’s weather pinned up top for mid-day reopen. Radar bounce-out.",
    weather: "external-radar",
  },
  {
    id: "04-start-checklist",
    name: "4 · Start checklist",
    blurb: "Tasks lead. Start-the-day group first, then commitment as a sticky footer.",
    weather: "internal",
  },
  {
    id: "05-split-river",
    name: "5 · Split river",
    blurb: "Two flows: commitment + tasks on the left; calendar, weather, workout on the right.",
    weather: "internal+radar",
  },
  {
    id: "06-snap-stories",
    name: "6 · Snap stories",
    blurb: "Horizontal snap cards — swipe commitment → tasks → day → weather → workout.",
    weather: "internal",
  },
  {
    id: "07-soft-glass",
    name: "7 · Soft glass",
    blurb: "Frosted tiles on a calm gradient field. Quiet chrome, strong fades.",
    weather: "internal+radar",
  },
  {
    id: "08-command-strip",
    name: "8 · Command strip",
    blurb: "Jump pills to each block. Dense status tiles with deep links.",
    weather: "internal",
  },
  {
    id: "09-timeline-day",
    name: "9 · Timeline day",
    blurb: "Single vertical spine. Commitment → start tasks → calendar → weather → workout.",
    weather: "internal+radar",
  },
  {
    id: "10-type-tiles",
    name: "10 · Type + tiles",
    blurb: "Bold modern display type for the commitment; compact tile row underneath.",
    weather: "internal",
  },
  {
    id: "11-quiet-list",
    name: "11 · Quiet list",
    blurb: "Almost no cards. Typography, spacing, and fade transitions do the work.",
    weather: "internal+radar",
  },
  {
    id: "12-workout-pulse",
    name: "12 · Workout pulse",
    blurb: "Workout status featured mid-page. Commitment stays the lead; tasks stay actionable.",
    weather: "internal",
  },
  {
    id: "13-radar-feature",
    name: "13 · Radar feature",
    blurb: "Weather as a full-width feature with clean facts + primary Radar CTA.",
    weather: "external-radar",
  },
  {
    id: "14-icon-grid",
    name: "14 · Icon grid",
    blurb: "App-home style square tiles that jump into each Open section.",
    weather: "internal",
  },
  {
    id: "15-compact-modules",
    name: "15 · Compact modules",
    blurb: "Status bar + one big commitment + tight modules. Fast reopen throughout the day.",
    weather: "internal+radar",
  },
] as const;

const COMMITMENT = "Stay level headed and aware of my surroundings";

const START_TASKS = [
  { label: "Journal", meta: "Home · start" },
  { label: "Medication", meta: "Home · start" },
];

const LATER_TASKS = [{ label: "Pack overnight bag", meta: "Travel" }];

const CAL_ROWS = [
  { when: "9:05–11a", title: "Flight AA 4104" },
  { when: "12:45–1:45p", title: "Declan vs Bears" },
  { when: "4–11:45p", title: "Lauren & Tanner wedding" },
];

const RADAR_HREF = "#radar"; // live Open will use radar.weather.gov

function Jump({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="om-jump" href={href}>
      {children}
    </a>
  );
}

function SamplePhone({
  id,
  name,
}: {
  id: (typeof SAMPLES)[number]["id"];
  name: string;
}) {
  return (
    <article className={`om-phone om-${id}`} data-sample={id}>
      <div className="om-phone-inner">
        {id === "01-bento-dawn" ? <BentoDawn /> : null}
        {id === "02-focus-first" ? <FocusFirst /> : null}
        {id === "03-weather-dock" ? <WeatherDock /> : null}
        {id === "04-start-checklist" ? <StartChecklist /> : null}
        {id === "05-split-river" ? <SplitRiver /> : null}
        {id === "06-snap-stories" ? <SnapStories /> : null}
        {id === "07-soft-glass" ? <SoftGlass /> : null}
        {id === "08-command-strip" ? <CommandStrip /> : null}
        {id === "09-timeline-day" ? <TimelineDay /> : null}
        {id === "10-type-tiles" ? <TypeTiles /> : null}
        {id === "11-quiet-list" ? <QuietList /> : null}
        {id === "12-workout-pulse" ? <WorkoutPulse /> : null}
        {id === "13-radar-feature" ? <RadarFeature /> : null}
        {id === "14-icon-grid" ? <IconGrid /> : null}
        {id === "15-compact-modules" ? <CompactModules /> : null}
      </div>
      <p className="om-caption">{name}</p>
    </article>
  );
}

function Mast({
  kicker = "Sunday · Open",
  title = "Morning",
}: {
  kicker?: string;
  title?: string;
}) {
  return (
    <header className="om-mast">
      <p className="om-flag">{kicker}</p>
      <h2 className="om-title">{title}</h2>
    </header>
  );
}

function Commitment({
  size = "md",
  withJump = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  withJump?: boolean;
}) {
  return (
    <section className={`om-commit om-commit-${size}`} id="commitment">
      <div className="om-commit-head">
        <p className="om-kicker">Do well today</p>
        {withJump ? <Jump href="#commitment">Focus</Jump> : null}
      </div>
      <h3 className="om-commit-text">{COMMITMENT}</h3>
    </section>
  );
}

function Tasks({
  startOnly = false,
  showLater = true,
}: {
  startOnly?: boolean;
  showLater?: boolean;
}) {
  return (
    <section className="om-tasks" id="tasks">
      <div className="om-sec-head">
        <p className="om-kicker">Start the day</p>
        <Jump href="#tasks">All tasks</Jump>
      </div>
      <ul className="om-task-list">
        {START_TASKS.map((t) => (
          <li key={t.label}>
            <span className="om-check" aria-hidden />
            <div>
              <strong>{t.label}</strong>
              <em>{t.meta}</em>
            </div>
          </li>
        ))}
      </ul>
      {!startOnly && showLater ? (
        <>
          <p className="om-kicker om-kicker-sub">Later</p>
          <ul className="om-task-list om-task-later">
            {LATER_TASKS.map((t) => (
              <li key={t.label}>
                <span className="om-check om-check-soft" aria-hidden />
                <div>
                  <strong>{t.label}</strong>
                  <em>{t.meta}</em>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Calendar() {
  return (
    <section className="om-cal" id="calendar">
      <div className="om-sec-head">
        <p className="om-kicker">Calendar</p>
        <Jump href="#calendar">Day view</Jump>
      </div>
      <p className="om-cal-lead">3 on the books</p>
      <ul className="om-cal-list">
        {CAL_ROWS.map((r) => (
          <li key={r.title}>
            <span>{r.when}</span>
            <strong>{r.title}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Weather({
  featured = false,
  radarPrimary = false,
}: {
  featured?: boolean;
  radarPrimary?: boolean;
}) {
  return (
    <section
      className={`om-wx${featured ? " om-wx-featured" : ""}`}
      id="weather"
    >
      <div className="om-sec-head">
        <p className="om-kicker">Today</p>
        <Jump href="#weather">Weather</Jump>
      </div>
      <div className="om-wx-hero">
        <span className="om-wx-icon" aria-hidden>
          ⛅
        </span>
        <div>
          <p className="om-wx-cond">Partly cloudy</p>
          <p className="om-wx-place">Los Angeles</p>
          <p className="om-wx-temps">
            <b>78°</b>
            <span> / 64°</span>
          </p>
        </div>
      </div>
      <dl className="om-wx-facts">
        <div>
          <dt>Rain</dt>
          <dd>12%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>11 mph</dd>
        </div>
        <div>
          <dt>UV</dt>
          <dd>7</dd>
        </div>
        <div>
          <dt>Feel</dt>
          <dd>76°</dd>
        </div>
      </dl>
      <a
        className={`om-radar${radarPrimary ? " om-radar-primary" : ""}`}
        href={RADAR_HREF}
        target="_blank"
        rel="noreferrer"
      >
        Open radar →
      </a>
    </section>
  );
}

function Workout({ featured = false }: { featured?: boolean }) {
  return (
    <section
      className={`om-wo${featured ? " om-wo-featured" : ""}`}
      id="workout"
    >
      <div className="om-sec-head">
        <p className="om-kicker">Workout</p>
        <Jump href="#workout">Log</Jump>
      </div>
      <p className="om-wo-status">No session yet</p>
      <p className="om-wo-hint">A short one opens the streak.</p>
    </section>
  );
}

/* ——— 15 layouts ——— */

function BentoDawn() {
  return (
    <>
      <Mast title="Open" />
      <div className="om-bento">
        <div className="om-bento-commit">
          <Commitment size="lg" />
        </div>
        <div className="om-bento-tasks">
          <Tasks startOnly />
        </div>
        <div className="om-bento-wx">
          <Weather />
        </div>
        <div className="om-bento-cal">
          <Calendar />
        </div>
        <div className="om-bento-wo">
          <Workout />
        </div>
      </div>
    </>
  );
}

function FocusFirst() {
  return (
    <>
      <Mast kicker="One thing" title="Focus" />
      <Commitment size="xl" withJump={false} />
      <div className="om-fade-stack">
        <Tasks />
        <Calendar />
        <div className="om-pair">
          <Weather />
          <Workout />
        </div>
      </div>
    </>
  );
}

function WeatherDock() {
  return (
    <>
      <div className="om-dock-wx">
        <Weather radarPrimary />
      </div>
      <Mast />
      <Commitment size="md" />
      <Tasks />
      <Calendar />
      <Workout />
    </>
  );
}

function StartChecklist() {
  return (
    <>
      <Mast kicker="Before you leave" title="Start" />
      <Tasks showLater />
      <Calendar />
      <div className="om-pair">
        <Weather />
        <Workout />
      </div>
      <div className="om-sticky-commit">
        <Commitment size="sm" />
      </div>
    </>
  );
}

function SplitRiver() {
  return (
    <>
      <Mast title="Day river" />
      <div className="om-river">
        <div className="om-river-main">
          <Commitment size="md" />
          <Tasks />
        </div>
        <div className="om-river-side">
          <Calendar />
          <Weather />
          <Workout />
        </div>
      </div>
    </>
  );
}

function SnapStories() {
  return (
    <>
      <Mast kicker="Swipe the day" title="Stories" />
      <div className="om-snap">
        <div className="om-snap-card">
          <Commitment size="lg" withJump={false} />
        </div>
        <div className="om-snap-card">
          <Tasks startOnly />
        </div>
        <div className="om-snap-card">
          <Calendar />
        </div>
        <div className="om-snap-card">
          <Weather radarPrimary />
        </div>
        <div className="om-snap-card">
          <Workout featured />
        </div>
      </div>
      <p className="om-snap-hint">Swipe →</p>
    </>
  );
}

function SoftGlass() {
  return (
    <>
      <div className="om-glass-bg" aria-hidden />
      <Mast title="Clear" />
      <div className="om-glass-stack">
        <Commitment size="lg" />
        <Tasks startOnly />
        <div className="om-pair">
          <Weather />
          <Workout />
        </div>
        <Calendar />
      </div>
    </>
  );
}

function CommandStrip() {
  return (
    <>
      <Mast kicker="Command" title="Open" />
      <nav className="om-pills" aria-label="Jump">
        <a href="#commitment">
          Commit
        </a>
        <a href="#tasks">
          Tasks
        </a>
        <a href="#calendar">
          Day
        </a>
        <a href="#weather">
          Weather
        </a>
        <a href="#workout">
          Move
        </a>
      </nav>
      <Commitment size="md" />
      <div className="om-status-grid">
        <Tasks startOnly />
        <Calendar />
        <Weather />
        <Workout />
      </div>
    </>
  );
}

function TimelineDay() {
  return (
    <>
      <Mast kicker="Spine" title="Timeline" />
      <ol className="om-spine">
        <li>
          <Commitment size="md" />
        </li>
        <li>
          <Tasks startOnly />
        </li>
        <li>
          <Calendar />
        </li>
        <li>
          <Weather />
        </li>
        <li>
          <Workout />
        </li>
      </ol>
    </>
  );
}

function TypeTiles() {
  return (
    <>
      <p className="om-flag">Sunday · Open</p>
      <Commitment size="xl" withJump={false} />
      <div className="om-tile-row">
        <Tasks startOnly />
        <Calendar />
        <Weather />
        <Workout />
      </div>
    </>
  );
}

function QuietList() {
  return (
    <>
      <Mast kicker="Quiet" title="Open" />
      <Commitment size="lg" withJump={false} />
      <div className="om-quiet">
        <Tasks />
        <Calendar />
        <Weather />
        <Workout />
      </div>
    </>
  );
}

function WorkoutPulse() {
  return (
    <>
      <Mast />
      <Commitment size="md" />
      <Tasks startOnly />
      <Workout featured />
      <div className="om-pair">
        <Calendar />
        <Weather />
      </div>
    </>
  );
}

function RadarFeature() {
  return (
    <>
      <Mast kicker="Outside" title="Air" />
      <Weather featured radarPrimary />
      <Commitment size="md" />
      <Tasks startOnly />
      <div className="om-pair">
        <Calendar />
        <Workout />
      </div>
    </>
  );
}

function IconGrid() {
  return (
    <>
      <Mast kicker="Launch" title="Open" />
      <Commitment size="md" />
      <div className="om-icons">
        <a className="om-icon-tile" href="#tasks">
          <span aria-hidden>✓</span>
          <strong>Tasks</strong>
          <em>2 to start</em>
        </a>
        <a
          className="om-icon-tile"
          href="#calendar"
        >
          <span aria-hidden>◷</span>
          <strong>Day</strong>
          <em>3 events</em>
        </a>
        <a
          className="om-icon-tile"
          href="#weather"
        >
          <span aria-hidden>⛅</span>
          <strong>Weather</strong>
          <em>78°</em>
        </a>
        <a
          className="om-icon-tile"
          href="#workout"
        >
          <span aria-hidden>↗</span>
          <strong>Move</strong>
          <em>Open streak</em>
        </a>
      </div>
      <Tasks startOnly />
      <Weather />
    </>
  );
}

function CompactModules() {
  return (
    <>
      <div className="om-status-bar">
        <span>Sun 20</span>
        <span>78° ⛅</span>
        <span>3 events</span>
      </div>
      <Commitment size="lg" />
      <div className="om-modules">
        <Tasks startOnly />
        <Calendar />
        <Weather />
        <Workout />
      </div>
    </>
  );
}

export default function OpenModernSamplesPage() {
  return (
    <main className="om-gallery">
      <header className="om-gallery-head">
        <p className="om-gallery-eyebrow">Modern Open · exploration</p>
        <h1>Daily Open — 15 layout options</h1>
        <p>
          Cleared newspaper chrome. Same core:{" "}
          <strong>commitment</strong>, <strong>start-the-day tasks</strong>,{" "}
          <strong>calendar</strong>, <strong>today weather</strong>,{" "}
          <strong>workout</strong>. High layout variance — tiles, timelines,
          snaps, docks, quiet type. Weather stays on Open for mid-day reopen,
          with radar bounce-out where it helps.
        </p>
        <p className="om-gallery-nav">
          <Link href="/layouts">← Layouts</Link>
          <Link href="/layouts/open-paper">Newspaper samples</Link>
        </p>
      </header>

      <div className="om-grid">
        {SAMPLES.map((sample) => (
          <div key={sample.id} className="om-cell">
            <SamplePhone id={sample.id} name={sample.name} />
            <p className="om-blurb">
              <strong>{sample.name}</strong>
              <span>{sample.blurb}</span>
              <span className="om-wx-tag">Weather · {sample.weather}</span>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
