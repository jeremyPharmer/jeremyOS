import Link from "next/link";
import "./open-paper-samples.css";

const SAMPLES = [
  {
    id: "01-editorial-stack",
    name: "1 · Editorial stack",
    blurb: "Lead → schedule → tasks → check-in → weather → history. Quiet hairlines.",
  },
  {
    id: "02-stats-first",
    name: "2 · Stats first",
    blurb: "Check-in scoreboard right under the lead — day starts with how you feel.",
  },
  {
    id: "03-split-day",
    name: "3 · Split day",
    blurb: "Schedule and planned tasks as peer panels with equal weight.",
  },
  {
    id: "04-soft-panels",
    name: "4 · Soft panels",
    blurb: "Gentle surface panels, more padding, less ink — easier to scan.",
  },
  {
    id: "05-brief-digest",
    name: "5 · Brief digest",
    blurb: "Axios-style short blocks with bold openers and thin rules.",
  },
  {
    id: "06-weather-feature",
    name: "6 · Weather feature",
    blurb: "Today’s weather as a mid-page feature with fact chips.",
  },
  {
    id: "07-timeline-spine",
    name: "7 · Timeline spine",
    blurb: "Day ahead as a vertical spine; tasks hang off the side.",
  },
  {
    id: "08-magazine-lead",
    name: "8 · Magazine lead",
    blurb: "Oversized lead + deck; everything else secondary type.",
  },
  {
    id: "09-index-rail",
    name: "9 · Index rail",
    blurb: "Tiny section index at top; jumpable chapters feel intentional.",
  },
  {
    id: "10-evening-mirror",
    name: "10 · Evening mirror",
    blurb: "Close twin: morning lead returns, remember + check-in + history.",
  },
] as const;

function SamplePhone({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const isEvening = id === "10-evening-mirror";
  return (
    <article className={`ops-phone ops-${id}`} data-sample={id}>
      <header className="ops-mast">
        <p className="ops-flag">{isEvening ? "Evening edition" : "Morning edition"}</p>
        <h2 className="ops-title">{isEvening ? "The Daily Close" : "The Daily Open"}</h2>
        <p className="ops-date">Sunday, September 20 · Rundown</p>
      </header>

      <div className="ops-lead">
        <p className="ops-kicker">Today&apos;s lead</p>
        <h3 className="ops-headline">Stay level headed and aware of my surroundings</h3>
      </div>

      {id === "09-index-rail" ? (
        <nav className="ops-index" aria-label="Sections">
          <span>Day</span>
          <span>Tasks</span>
          <span>Check-in</span>
          <span>Weather</span>
          <span>History</span>
        </nav>
      ) : null}

      {id === "02-stats-first" ? <CheckInBlock prominent /> : null}

      <section className="ops-block ops-schedule">
        <p className="ops-kicker">The day ahead</p>
        <p className="ops-section-head">7 on the books.</p>
        <ul className="ops-timetable">
          <li>
            <span>9:05–11a</span>
            <span>Flight AA 4104</span>
          </li>
          <li>
            <span>12:45–1:45p</span>
            <span>Declan vs Bears</span>
          </li>
          <li>
            <span>4–11:45p</span>
            <span>Lauren &amp; Tanner wedding</span>
          </li>
        </ul>
      </section>

      <section className="ops-block ops-tasks">
        <p className="ops-kicker">Planned tasks</p>
        <ul className="ops-task-list">
          <li>
            <strong>Journal</strong>
            <em>Home</em>
          </li>
          <li>
            <strong>Medication</strong>
            <em>Home</em>
          </li>
        </ul>
      </section>

      {id !== "02-stats-first" ? <CheckInBlock /> : null}

      <section className="ops-block ops-weather">
        <p className="ops-kicker">Today&apos;s weather</p>
        <div className="ops-weather-hero">
          <span className="ops-wx-icon" aria-hidden>
            ⛅
          </span>
          <div>
            <p className="ops-wx-label">Partly cloudy</p>
            <p className="ops-wx-place">Los Angeles</p>
            <p className="ops-wx-temps">
              <b>78°</b> / 64°
            </p>
          </div>
        </div>
        <p className="ops-wx-note">
          Partly cloudy. Mostly dry · UV 7. High 78° / low 64°.
        </p>
        <dl className="ops-wx-facts">
          <div>
            <dt>Rain</dt>
            <dd>12% chance</dd>
          </div>
          <div>
            <dt>Wind</dt>
            <dd>up to 11 mph</dd>
          </div>
          <div>
            <dt>UV</dt>
            <dd>7</dd>
          </div>
          <div>
            <dt>High / Low</dt>
            <dd>78° / 64°</dd>
          </div>
        </dl>
      </section>

      {isEvening ? (
        <section className="ops-block ops-remember">
          <p className="ops-kicker">Remember</p>
          <p className="ops-section-head">A quieter dinner after the wedding.</p>
        </section>
      ) : null}

      <section className="ops-block ops-history">
        <p className="ops-kicker">On this date · September 20</p>
        <p className="ops-history-world">
          <span>1991</span> Ötzi discovered in the Alps by two German tourists.
        </p>
        <p className="ops-history-journal">
          <span>2025</span> Walked the long way home.
        </p>
      </section>

      <p className="ops-caption">{name}</p>
    </article>
  );
}

function CheckInBlock({ prominent = false }: { prominent?: boolean }) {
  return (
    <section className={`ops-block ops-pulse${prominent ? " ops-pulse-hero" : ""}`}>
      <div className="ops-pulse-head">
        <p className="ops-kicker">Check-in</p>
        <p className="ops-pulse-sub">Today vs last week</p>
      </div>
      <div className="ops-pulse-grid">
        {[
          ["Mood", "7", "up from wk 5.1"],
          ["Energy", "6", "up from wk 4.8"],
          ["Stress", "4", "down from wk 6.2"],
          ["Sleep", "7.5h", "up from wk 6.4h"],
          ["Quality", "7", "up from wk 5.6"],
        ].map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{delta}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OpenPaperSamplesPage() {
  return (
    <main className="ops-gallery">
      <header className="ops-gallery-head">
        <p className="ops-gallery-eyebrow">Layout exploration</p>
        <h1>Daily Open — 10 layout samples</h1>
        <p>
          Same information, different rhythm. Pick a direction and we lock it
          into the live Open / Close paper.
        </p>
        <p className="ops-gallery-nav">
          <Link href="/layouts">← Layouts</Link>
        </p>
      </header>
      <div className="ops-grid">
        {SAMPLES.map((sample) => (
          <div key={sample.id} className="ops-cell">
            <SamplePhone id={sample.id} name={sample.name} />
            <p className="ops-blurb">
              <strong>{sample.name}</strong>
              <span>{sample.blurb}</span>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
