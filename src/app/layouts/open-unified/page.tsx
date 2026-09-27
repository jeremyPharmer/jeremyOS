"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./open-unified-samples.css";

type ScaleKey = "sleep" | "quality" | "mood" | "energy" | "stress";

type ScaleValues = Record<ScaleKey, number | null>;

const SCALE_META: { key: ScaleKey; label: string; min?: number; max?: number; step?: number }[] =
  [
    { key: "sleep", label: "Hours slept", min: 4, max: 10, step: 0.5 },
    { key: "quality", label: "Sleep quality" },
    { key: "mood", label: "Mood" },
    { key: "energy", label: "Energy" },
    { key: "stress", label: "Stress" },
  ];

const SAMPLES = [
  {
    id: "01-edition-box",
    name: "1 · Edition box",
    blurb:
      "Paper masthead. Check-in is the top edition box; collapses to a one-line strip over the rundown.",
  },
  {
    id: "02-lead-then-vitals",
    name: "2 · Lead then vitals",
    blurb:
      "Commitment field first (the lead), then compact vitals. Same paper body underneath.",
  },
  {
    id: "03-pill-row",
    name: "3 · Pill rows",
    blurb:
      "Fresher scales as soft pill chips. Easier thumb targets; collapses into a scoreboard chip.",
  },
  {
    id: "04-dot-meters",
    name: "4 · Dot meters",
    blurb:
      "Big tap dots, few labels. Feels like a modern wellness paper, not a form.",
  },
  {
    id: "05-inline-story",
    name: "5 · Inline story",
    blurb:
      "Check-in reads as the first story of the paper. Finish → story folds into a byline.",
  },
  {
    id: "06-sticky-folio",
    name: "6 · Sticky folio",
    blurb:
      "Paper always in view. Check-in sticks as a folio until done, then shrinks to a header chip.",
  },
  {
    id: "07-split-folio",
    name: "7 · Split folio",
    blurb:
      "Narrow vitals column beside the lead on the same folio page; collapses to a slim mast row.",
  },
  {
    id: "08-quiet-sheet",
    name: "8 · Quiet sheet",
    blurb:
      "Almost no chrome. Serif paper + hairlines. Scales as a quiet number rail that vanishes.",
  },
] as const;

const EMPTY: ScaleValues = {
  sleep: null,
  quality: null,
  mood: null,
  energy: null,
  stress: null,
};

const DEMO_FILLED: ScaleValues = {
  sleep: 7.5,
  quality: 7,
  mood: 7,
  energy: 6,
  stress: 4,
};

function scalesReady(v: ScaleValues) {
  return SCALE_META.every(({ key }) => v[key] != null);
}

function fmt(n: number | null, step = 1) {
  if (n == null) return "—";
  return step < 1 && !Number.isInteger(n) ? n.toFixed(1) : String(n);
}

export default function OpenUnifiedSamplesPage() {
  return (
    <main className="ou-gallery">
      <header className="ou-gallery-head">
        <p className="ou-eyebrow">Remodel · Daily Open</p>
        <h1>One Open — questions + paper</h1>
        <p>
          Check-in and morning news share one scroll. Fresher scales. When you
          finish, the check-in collapses — the paper stays. Same type system
          throughout so it no longer feels like two apps.
        </p>
        <p className="ou-hint">
          On each phone: tap scales (or <strong>Fill</strong>), add a line, then
          watch it collapse into the edition.
        </p>
        <p className="ou-nav">
          <Link href="/layouts">← Layouts</Link>
          <Link href="/layouts/open-modern">Modern Open samples</Link>
        </p>
      </header>

      <div className="ou-grid">
        {SAMPLES.map((s) => (
          <SamplePhone key={s.id} id={s.id} name={s.name} blurb={s.blurb} />
        ))}
      </div>
    </main>
  );
}

function SamplePhone({
  id,
  name,
  blurb,
}: {
  id: (typeof SAMPLES)[number]["id"];
  name: string;
  blurb: string;
}) {
  const [values, setValues] = useState<ScaleValues>({ ...EMPTY });
  const [intention, setIntention] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const ready = scalesReady(values) && intention.trim().length > 0;

  function setScale(key: ScaleKey, n: number) {
    setValues((prev) => ({ ...prev, [key]: n }));
  }

  function fillDemo() {
    setValues({ ...DEMO_FILLED });
    setIntention("Stay level headed and aware of my surroundings");
  }

  function finish() {
    if (!ready) return;
    setCollapsed(true);
  }

  function reopen() {
    setCollapsed(false);
  }

  function reset() {
    setValues({ ...EMPTY });
    setIntention("");
    setCollapsed(false);
  }

  const summary = useMemo(() => {
    if (!scalesReady(values)) return null;
    return `S ${fmt(values.sleep, 0.5)} · Q ${fmt(values.quality)} · M ${fmt(values.mood)} · E ${fmt(values.energy)} · St ${fmt(values.stress)}`;
  }, [values]);

  return (
    <div className="ou-cell">
      <article className={`ou-phone ou-${id}`} data-sample={id}>
        <div className="ou-phone-inner">
          <header className="ou-mast">
            <p className="ou-flag">Sunday, September 27 · Morning edition</p>
            <h2 className="ou-title">The Daily Open</h2>
            <div className="ou-rule" aria-hidden />
          </header>

          {/* Check-in: expanded or collapsed */}
          {!collapsed ? (
            <section className="ou-checkin" aria-label="Morning check-in">
              <div className="ou-checkin-head">
                <p className="ou-kicker">Check in</p>
                <span className="ou-checkin-note">About a minute</span>
              </div>

              {id === "02-lead-then-vitals" || id === "07-split-folio" ? (
                <label className="ou-lead-field">
                  <span className="ou-kicker">Do well today</span>
                  <input
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="One short line"
                  />
                </label>
              ) : null}

              <div
                className={
                  id === "07-split-folio"
                    ? "ou-vitals ou-vitals-split"
                    : "ou-vitals"
                }
              >
                {SCALE_META.map((meta) => (
                  <ScaleControl
                    key={meta.key}
                    variant={scaleVariant(id)}
                    label={meta.label}
                    value={values[meta.key]}
                    min={meta.min ?? 1}
                    max={meta.max ?? 10}
                    step={meta.step ?? 1}
                    onChange={(n) => setScale(meta.key, n)}
                  />
                ))}
              </div>

              {id !== "02-lead-then-vitals" && id !== "07-split-folio" ? (
                <label className="ou-lead-field">
                  <span className="ou-kicker">Do well today</span>
                  <input
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="One short line"
                  />
                </label>
              ) : null}

              <button
                type="button"
                className="ou-finish"
                disabled={!ready}
                onClick={finish}
              >
                Open the paper
              </button>
            </section>
          ) : (
            <button
              type="button"
              className="ou-collapsed"
              onClick={reopen}
              aria-label="Expand check-in"
            >
              <span className="ou-collapsed-lead">
                {intention.trim() || "Today’s lead"}
              </span>
              <span className="ou-collapsed-meta">{summary}</span>
              <span className="ou-collapsed-edit">Edit</span>
            </button>
          )}

          {/* Paper always present — dims slightly while checking in */}
          <div
            className={`ou-paper${collapsed ? " ou-paper-live" : " ou-paper-wait"}`}
          >
            <PaperBody commitment={intention.trim()} revealed={collapsed} />
          </div>
        </div>
        <div className="ou-phone-tools">
          <button type="button" onClick={fillDemo}>
            Fill
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </article>
      <p className="ou-blurb">
        <strong>{name}</strong>
        <span>{blurb}</span>
      </p>
    </div>
  );
}

function scaleVariant(
  id: (typeof SAMPLES)[number]["id"],
): "rail" | "pills" | "dots" | "quiet" {
  if (id === "03-pill-row") return "pills";
  if (id === "04-dot-meters") return "dots";
  if (id === "08-quiet-sheet") return "quiet";
  return "rail";
}

function ScaleControl({
  variant,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  variant: "rail" | "pills" | "dots" | "quiet";
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const ticks: number[] = [];
  for (let n = min; n <= max + 1e-9; n += step) {
    ticks.push(Math.round(n * 1000) / 1000);
  }

  return (
    <div className={`ou-scale ou-scale-${variant}`}>
      <div className="ou-scale-label">
        <span>{label}</span>
        <em>{fmt(value, step)}</em>
      </div>
      <div className="ou-scale-line" role="radiogroup" aria-label={label}>
        {ticks.map((n) => {
          const selected = value != null && Math.abs(value - n) < step / 2;
          const text =
            step < 1 && !Number.isInteger(n) ? n.toFixed(1) : String(n);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? "is-on" : undefined}
              onClick={() => onChange(n)}
            >
              {variant === "dots" ? <span className="ou-dot" /> : text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaperBody({
  commitment,
  revealed,
}: {
  commitment: string;
  revealed: boolean;
}) {
  return (
    <div className="ou-rundown">
      {commitment && revealed ? (
        <section className="ou-story ou-story-lead">
          <p className="ou-kicker">Today&apos;s lead</p>
          <h3>{commitment}</h3>
        </section>
      ) : null}

      <section className="ou-story">
        <p className="ou-kicker">Start the day</p>
        <ul className="ou-tasks">
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

      <section className="ou-story">
        <p className="ou-kicker">Calendar</p>
        <p className="ou-cal-lead">3 on the books</p>
        <ul className="ou-cal">
          <li>
            <span>9:05–11a</span>
            <strong>Flight AA 4104</strong>
          </li>
          <li>
            <span>12:45–1:45p</span>
            <strong>Declan vs Bears</strong>
          </li>
          <li>
            <span>4–11:45p</span>
            <strong>Lauren &amp; Tanner wedding</strong>
          </li>
        </ul>
      </section>

      <div className="ou-pair">
        <section className="ou-story">
          <p className="ou-kicker">Today</p>
          <p className="ou-wx">
            <span aria-hidden>⛅</span> Partly cloudy · <b>78°</b> / 64°
          </p>
          <p className="ou-wx-facts">Rain 12% · Wind 11 · UV 7</p>
          <span className="ou-radar">Radar →</span>
        </section>
        <section className="ou-story">
          <p className="ou-kicker">Workout</p>
          <p className="ou-wo">No session yet</p>
          <p className="ou-wx-facts">A short one opens the streak.</p>
        </section>
      </div>
    </div>
  );
}
