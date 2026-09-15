"use client";

import Link from "next/link";

const LOGO = "/bills-classic.svg";

type SampleGame = {
  week: string;
  vs: string;
  opp: string;
  when: string;
  done?: boolean;
  next?: boolean;
  live?: boolean;
};

const GAMES: SampleGame[] = [
  { week: "Wk 1", vs: "vs BAL", opp: "Ravens", when: "Sun · 9/7, 1:00 PM", done: true },
  { week: "Wk 2", vs: "@ NYJ", opp: "Jets", when: "Sun · 9/14, 1:00 PM", next: true },
  { week: "Wk 3", vs: "vs MIA", opp: "Dolphins", when: "Thu · 9/18, 8:15 PM" },
  { week: "Wk 4", vs: "vs NO", opp: "Saints", when: "Sun · 9/28, 1:00 PM" },
  { week: "Wk 5", vs: "@ NE", opp: "Patriots", when: "Sun · 10/5, 4:25 PM" },
  { week: "Wk 6", vs: "BYE", opp: "—", when: "—" },
];

const OPTIONS = [
  {
    id: "native",
    name: "1 · Native peer",
    vibe: "Same shell as Move / Crossword — kicker, title, sub, quiet list. Zero novelty chrome.",
  },
  {
    id: "lockup",
    name: "2 · Logo lockup",
    vibe: "Classic mark sits with the title like a team header; schedule stays app-native.",
  },
  {
    id: "next-up",
    name: "3 · Next-up focus",
    vibe: "One featured kickoff, then a compact season list. Feels like Home, not a stub.",
  },
  {
    id: "rail",
    name: "4 · Accent rail",
    vibe: "Standard card with a thin Bills-blue edge — team signal without a costume.",
  },
  {
    id: "wash",
    name: "5 · Soft wash",
    vibe: "Very light blue tint on the normal surface. Brand whisper, not cream paper.",
  },
  {
    id: "scoreboard",
    name: "6 · Quiet scoreboard",
    vibe: "Dense rows, tabular when-column — still uses --surface / --line / radius.",
  },
  {
    id: "timeline",
    name: "7 · Season timeline",
    vibe: "Vertical rail through the year; next game is the only loud mark.",
  },
  {
    id: "split",
    name: "8 · Split board",
    vibe: "Mark + record on the left, schedule on the right (stacks on narrow).",
  },
  {
    id: "chips",
    name: "9 · Week chips",
    vibe: "Agenda-style chips for kickoffs — matches Open / tasks energy.",
  },
  {
    id: "minimal",
    name: "10 · Minimal embed",
    vibe: "Smallest footprint: tiny mark in the kicker row, schedule only.",
  },
] as const;

function ScheduleRows({
  dense,
  showOpp,
}: {
  dense?: boolean;
  showOpp?: boolean;
}) {
  return (
    <ul className={`bills-alt-rows${dense ? " is-dense" : ""}`}>
      {GAMES.map((g) => (
        <li
          key={g.week}
          className={[
            "bills-alt-row",
            g.done ? "is-done" : "",
            g.next || g.live ? "is-next" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="bills-alt-week">
            {g.week}
            {g.live ? <span className="bills-alt-pill">Live</span> : null}
            {g.next && !g.live ? (
              <span className="bills-alt-pill">Next</span>
            ) : null}
          </span>
          <span className="bills-alt-match">
            <span className="bills-alt-vs">{g.vs}</span>
            {showOpp ? <span className="bills-alt-opp">{g.opp}</span> : null}
          </span>
          <span className="bills-alt-when">{g.when}</span>
        </li>
      ))}
    </ul>
  );
}

function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="bills-alt-logo"
      src={LOGO}
      alt=""
      width={size}
      height={size}
    />
  );
}

function Variant({ id }: { id: (typeof OPTIONS)[number]["id"] }) {
  switch (id) {
    case "native":
      return (
        <section className="home-card bills-alt bills-alt-native">
          <div className="home-card-head">
            <p className="home-card-kicker">Buffalo Bills</p>
            <h2>Season</h2>
            <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
          </div>
          <ScheduleRows showOpp />
        </section>
      );
    case "lockup":
      return (
        <section className="home-card bills-alt bills-alt-lockup">
          <div className="bills-alt-lockup-head">
            <Logo size={48} />
            <div className="home-card-head">
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Buffalo Bills</h2>
              <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
            </div>
          </div>
          <ScheduleRows showOpp />
        </section>
      );
    case "next-up":
      return (
        <section className="home-card bills-alt bills-alt-next">
          <div className="home-card-head bills-alt-next-head">
            <div>
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Next up</h2>
              <p className="tiny home-card-sub">1-0 · AFC East</p>
            </div>
            <Logo size={44} />
          </div>
          <div className="bills-alt-featured">
            <p className="bills-alt-featured-match">@ Jets</p>
            <p className="bills-alt-featured-when">Sun · 9/14, 1:00 PM</p>
            <p className="tiny bills-alt-featured-meta">Week 2 · Away</p>
          </div>
          <ScheduleRows dense />
        </section>
      );
    case "rail":
      return (
        <section className="home-card bills-alt bills-alt-rail">
          <div className="bills-alt-lockup-head">
            <Logo size={40} />
            <div className="home-card-head">
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Season</h2>
              <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
            </div>
          </div>
          <ScheduleRows showOpp />
        </section>
      );
    case "wash":
      return (
        <section className="home-card bills-alt bills-alt-wash">
          <div className="bills-alt-lockup-head">
            <Logo size={42} />
            <div className="home-card-head">
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Season</h2>
              <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
            </div>
          </div>
          <ScheduleRows showOpp />
        </section>
      );
    case "scoreboard":
      return (
        <section className="home-card bills-alt bills-alt-scoreboard">
          <div className="home-card-head bills-alt-score-head">
            <Logo size={32} />
            <div>
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>1-0 · AFC East</h2>
            </div>
          </div>
          <div className="bills-alt-cols" aria-hidden>
            <span>Wk</span>
            <span>Matchup</span>
            <span>Kickoff</span>
          </div>
          <ScheduleRows dense showOpp />
        </section>
      );
    case "timeline":
      return (
        <section className="home-card bills-alt bills-alt-timeline">
          <div className="home-card-head bills-alt-next-head">
            <div>
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Season</h2>
              <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
            </div>
            <Logo size={40} />
          </div>
          <ol className="bills-alt-tl">
            {GAMES.map((g) => (
              <li
                key={g.week}
                className={[
                  "bills-alt-tl-item",
                  g.done ? "is-done" : "",
                  g.next ? "is-next" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="bills-alt-tl-dot" aria-hidden />
                <div className="bills-alt-tl-body">
                  <div className="bills-alt-tl-top">
                    <strong>{g.vs}</strong>
                    <span>{g.when}</span>
                  </div>
                  <p className="tiny">
                    {g.week}
                    {g.next ? " · Next" : ""}
                    {g.done ? " · Final" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    case "split":
      return (
        <section className="home-card bills-alt bills-alt-split">
          <div className="bills-alt-split-brand">
            <Logo size={72} />
            <p className="home-card-kicker">Buffalo Bills</p>
            <h2>1-0</h2>
            <p className="tiny home-card-sub">AFC East · W1</p>
          </div>
          <div className="bills-alt-split-sched">
            <ScheduleRows showOpp />
          </div>
        </section>
      );
    case "chips":
      return (
        <section className="home-card bills-alt bills-alt-chips">
          <div className="home-card-head bills-alt-next-head">
            <div>
              <p className="home-card-kicker">Buffalo Bills</p>
              <h2>Season</h2>
              <p className="tiny home-card-sub">1-0 · AFC East · W1</p>
            </div>
            <Logo size={40} />
          </div>
          <div className="bills-alt-chip-row">
            {GAMES.map((g) => (
              <div
                key={g.week}
                className={[
                  "bills-alt-chip",
                  g.done ? "is-done" : "",
                  g.next ? "is-next" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="bills-alt-chip-wk">{g.week}</span>
                <span className="bills-alt-chip-vs">{g.vs}</span>
                <span className="bills-alt-chip-when">{g.when}</span>
              </div>
            ))}
          </div>
        </section>
      );
    case "minimal":
      return (
        <section className="home-card bills-alt bills-alt-minimal">
          <div className="bills-alt-min-head">
            <Logo size={22} />
            <p className="home-card-kicker">Buffalo Bills · 1-0 · AFC East</p>
          </div>
          <ScheduleRows dense />
        </section>
      );
    default:
      return null;
  }
}

export default function BillsLooksPage() {
  return (
    <main className="page bills-looks-board">
      <header className="layouts-board-header">
        <p className="eyebrow">Home · Bills panel</p>
        <h1>Look alternatives</h1>
        <p className="muted">
          Function and copy stay the same. These ten drop the ticket-stub costume
          and try to sit next to Move / Crossword using the app&apos;s surface,
          radius, kickers, and type. Classic charging-buffalo mark is{" "}
          <code>/bills-classic.svg</code>.
        </p>
        <div className="layouts-board-links">
          <Link href="/" className="layouts-board-link">
            ← Home
          </Link>
          <Link href="/themes" className="layouts-board-link">
            Themes
          </Link>
          <Link href="/layouts" className="layouts-board-link">
            Layouts
          </Link>
        </div>
      </header>

      <div className="bills-looks-logo-strip panel">
        <Logo size={64} />
        <div>
          <p className="home-card-kicker">Mark in use</p>
          <h2 style={{ margin: "4px 0 0", fontSize: "1.1rem" }}>
            Classic charging buffalo
          </h2>
          <p className="tiny muted" style={{ margin: "6px 0 0" }}>
            Royal blue disc · scarlet ring · red buffalo (classic-era silhouette).
            Not the modern charging mark.
          </p>
        </div>
      </div>

      <section className="bills-looks-grid">
        {OPTIONS.map((opt) => (
          <article key={opt.id} className="bills-looks-option">
            <header className="bills-looks-option-head">
              <h2>{opt.name}</h2>
              <p className="muted">{opt.vibe}</p>
            </header>
            <Variant id={opt.id} />
          </article>
        ))}
      </section>
    </main>
  );
}
