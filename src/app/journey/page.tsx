"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  SLEEP_QUALITY_SCALE_5_START,
  formatTrendDate,
  resolveConditionRange,
  sleepQualityAverage,
  sleepQualityPointsInRange,
  type ConditionRangePreset,
} from "@/lib/trends";
import type { RebuildState, VitalsPeriod } from "@/lib/types";
import {
  filledVitalsPointsInRange,
  formatVitalsReading,
  vitalsSorted,
} from "@/lib/vitals";

const RANGE_OPTIONS: { key: ConditionRangePreset; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "custom", label: "Custom" },
];

function SleepQualityChart({
  state,
  today,
}: {
  state: RebuildState;
  today: string;
}) {
  const minStart = SLEEP_QUALITY_SCALE_5_START;
  const [preset, setPreset] = useState<ConditionRangePreset>("30");
  const [customStart, setCustomStart] = useState(minStart);
  const [customEnd, setCustomEnd] = useState(today);

  function selectPreset(next: ConditionRangePreset) {
    setPreset(next);
    if (next === "custom") {
      const bounds = resolveConditionRange(preset, minStart, today, {
        start: customStart,
        end: customEnd,
      });
      setCustomStart(bounds.start);
      setCustomEnd(bounds.end);
    }
  }

  const range = useMemo(
    () =>
      resolveConditionRange(
        preset,
        minStart,
        today,
        preset === "custom" ? { start: customStart, end: customEnd } : undefined,
      ),
    [preset, minStart, today, customStart, customEnd],
  );

  const points = useMemo(
    () => sleepQualityPointsInRange(state, range.start, range.end),
    [state, range.start, range.end],
  );

  const avg = useMemo(() => sleepQualityAverage(points), [points]);
  const loggedCount = points.filter((p) => p.sleepQuality != null).length;

  return (
    <div className="health-sleep">
      <div className="health-sleep-summary">
        {avg != null ? (
          <>
            <p className="health-sleep-avg">
              <span className="health-sleep-avg-num">{avg.toFixed(1)}</span>
              <span className="health-sleep-avg-unit">avg · 1–5</span>
            </p>
            <p className="muted health-sleep-detail">
              {loggedCount} night{loggedCount === 1 ? "" : "s"} since{" "}
              {formatTrendDate(range.start)}
            </p>
          </>
        ) : (
          <p className="muted health-sleep-detail">
            Sleep quality appears after Open check-ins (1–5).
          </p>
        )}
      </div>

      <div className="trend-range-toggles" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={
              preset === option.key
                ? "trend-range-toggle on"
                : "trend-range-toggle"
            }
            onClick={() => selectPreset(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="trend-custom-range">
          <label className="trend-custom-field">
            <span className="field-label">From</span>
            <input
              type="date"
              value={customStart}
              min={minStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </label>
          <label className="trend-custom-field">
            <span className="field-label">To</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}

      <SleepLineChart
        points={points}
        rangeStart={range.start}
        rangeEnd={range.end}
      />
    </div>
  );
}

function SleepLineChart({
  points,
  rangeStart,
  rangeEnd,
  width = 320,
  height = 168,
}: {
  points: { date: string; sleepQuality?: number }[];
  rangeStart: string;
  rangeEnd: string;
  width?: number;
  height?: number;
}) {
  const pad = { top: 14, right: 12, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const min = 1;
  const max = 5;
  const ticks = [1, 2, 3, 4, 5];
  const color = "#6aaf8e";
  const xSpan = Math.max(points.length - 1, 1);

  function yCoord(value: number): number {
    return pad.top + innerH - ((value - min) / (max - min)) * innerH;
  }

  const xs = points.map((_, i) =>
    points.length === 1
      ? pad.left + innerW / 2
      : pad.left + (i / xSpan) * innerW,
  );

  const coords: { x: number; y: number }[] = [];
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const v = points[i]!.sleepQuality;
    if (v === undefined) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    const c = { x: xs[i]!, y: yCoord(v) };
    coords.push(c);
    current.push(c);
  }
  if (current.length > 0) segments.push(current);

  if (coords.length === 0) {
    return (
      <p className="muted" style={{ marginTop: 12 }}>
        No sleep quality yet in this range.
      </p>
    );
  }

  const pathD = segments
    .map((seg) =>
      seg
        .map(
          (c, i) =>
            `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
        )
        .join(" "),
    )
    .join(" ");

  const areaD = segments
    .map((seg) => {
      if (seg.length === 0) return "";
      const baseY = yCoord(min);
      const line = seg
        .map(
          (c, i) =>
            `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
        )
        .join(" ");
      const last = seg[seg.length - 1]!;
      const first = seg[0]!;
      return `${line} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      key={`${rangeStart}-${rangeEnd}-${points.length}`}
      className="trend-svg health-sleep-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Sleep quality trend"
    >
      <defs>
        <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((v) => {
        const y = yCoord(v);
        return (
          <g key={`tick-${v}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              className="trend-grid"
            />
            <text x={4} y={y + 3} className="trend-axis">
              {v}
            </text>
          </g>
        );
      })}
      {areaD && <path d={areaD} fill="url(#sleepFill)" />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.4" fill={color} />
      ))}
      <text x={pad.left} y={height - 8} className="trend-axis">
        {formatTrendDate(rangeStart)}
      </text>
      {rangeEnd !== rangeStart && (
        <text
          x={width - pad.right}
          y={height - 8}
          textAnchor="end"
          className="trend-axis"
        >
          {formatTrendDate(rangeEnd)}
        </text>
      )}
    </svg>
  );
}

function BloodPressureViz({
  state,
  today,
}: {
  state: RebuildState;
  today: string;
}) {
  const minStart =
    state.profile?.currentRunStartedOn ??
    state.profile?.startDate ??
    today;
  const [preset, setPreset] = useState<ConditionRangePreset>("30");
  const [customStart, setCustomStart] = useState(minStart);
  const [customEnd, setCustomEnd] = useState(today);

  const range = useMemo(
    () =>
      resolveConditionRange(
        preset,
        minStart,
        today,
        preset === "custom" ? { start: customStart, end: customEnd } : undefined,
      ),
    [preset, minStart, today, customStart, customEnd],
  );

  const points = useMemo(
    () => filledVitalsPointsInRange(state, range.start, range.end),
    [state, range.start, range.end],
  );

  const latest = useMemo(() => vitalsSorted(state)[0], [state]);

  return (
    <div className="health-bp">
      {latest && (
        <div className="health-bp-latest">
          <p className="health-bp-latest-vals">
            {latest.systolic}
            <span className="health-bp-slash">/</span>
            {latest.diastolic}
            <span className="health-bp-unit"> mmHg</span>
          </p>
          <p className="muted health-bp-latest-meta">
            Latest · {formatTrendDate(latest.date)} ·{" "}
            {latest.period.toUpperCase()} · {latest.heartRate} bpm
          </p>
        </div>
      )}

      <div className="trend-range-toggles" role="group" aria-label="BP date range">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={
              preset === option.key
                ? "trend-range-toggle on"
                : "trend-range-toggle"
            }
            onClick={() => {
              setPreset(option.key);
              if (option.key === "custom") {
                const bounds = resolveConditionRange(preset, minStart, today, {
                  start: customStart,
                  end: customEnd,
                });
                setCustomStart(bounds.start);
                setCustomEnd(bounds.end);
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="trend-custom-range">
          <label className="trend-custom-field">
            <span className="field-label">From</span>
            <input
              type="date"
              value={customStart}
              min={minStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </label>
          <label className="trend-custom-field">
            <span className="field-label">To</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}

      <BpRangeChart
        points={points}
        rangeStart={range.start}
        rangeEnd={range.end}
      />
    </div>
  );
}

function BpRangeChart({
  points,
  rangeStart,
  rangeEnd,
  width = 320,
  height = 180,
}: {
  points: {
    date: string;
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
  }[];
  rangeStart: string;
  rangeEnd: string;
  width?: number;
  height?: number;
}) {
  const pad = { top: 14, right: 28, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const bpMin = 60;
  const bpMax = 180;
  const bpTicks = [60, 90, 120, 150, 180];
  const hrMin = 40;
  const hrMax = 120;
  const sysColor = "#c45c4a";
  const diaColor = "#d48a4a";
  const hrColor = "#4a7eb5";

  const logged = points.filter(
    (p) => p.systolic != null && p.diastolic != null,
  );

  if (logged.length === 0) {
    return (
      <p className="muted" style={{ marginTop: 12 }}>
        Blood pressure readings appear as you log them.
      </p>
    );
  }

  function yBp(v: number): number {
    return pad.top + innerH - ((v - bpMin) / (bpMax - bpMin)) * innerH;
  }
  function yHr(v: number): number {
    return pad.top + innerH - ((v - hrMin) / (hrMax - hrMin)) * innerH;
  }

  const n = Math.max(logged.length, 1);
  const slot = innerW / n;
  const barW = Math.min(10, Math.max(4, slot * 0.45));

  const hrCoords = logged
    .map((p, i) => {
      if (p.heartRate == null) return null;
      const x = pad.left + slot * i + slot / 2;
      return { x, y: yHr(p.heartRate) };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const hrPath =
    hrCoords.length > 1
      ? hrCoords
          .map(
            (c, i) =>
              `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
          )
          .join(" ")
      : "";

  return (
    <>
      <svg
        key={`${rangeStart}-${rangeEnd}-${logged.length}`}
        className="trend-svg health-bp-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Blood pressure range chart"
      >
        {bpTicks.map((v) => {
          const y = yBp(v);
          return (
            <g key={`bp-${v}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                className="trend-grid"
              />
              <text x={4} y={y + 3} className="trend-axis">
                {v}
              </text>
            </g>
          );
        })}
        <text
          x={width - 4}
          y={yHr(80) + 3}
          textAnchor="end"
          className="trend-axis"
        >
          HR
        </text>
        {logged.map((p, i) => {
          const x = pad.left + slot * i + slot / 2;
          const ySys = yBp(p.systolic!);
          const yDia = yBp(p.diastolic!);
          return (
            <g key={p.date}>
              <line
                x1={x}
                x2={x}
                y1={ySys}
                y2={yDia}
                stroke={sysColor}
                strokeWidth={barW}
                strokeLinecap="round"
                opacity={0.85}
              />
              <circle cx={x} cy={ySys} r={3} fill={sysColor} />
              <circle cx={x} cy={yDia} r={3} fill={diaColor} />
            </g>
          );
        })}
        {hrPath && (
          <path
            d={hrPath}
            fill="none"
            stroke={hrColor}
            strokeWidth="1.75"
            strokeDasharray="3 3"
            opacity={0.9}
          />
        )}
        {hrCoords.map((c, i) => (
          <circle key={`hr-${i}`} cx={c.x} cy={c.y} r="2.4" fill={hrColor} />
        ))}
        <text x={pad.left} y={height - 8} className="trend-axis">
          {formatTrendDate(logged[0]!.date)}
        </text>
        {logged.length > 1 && (
          <text
            x={width - pad.right}
            y={height - 8}
            textAnchor="end"
            className="trend-axis"
          >
            {formatTrendDate(logged[logged.length - 1]!.date)}
          </text>
        )}
      </svg>
      <div className="health-bp-legend" aria-hidden>
        <span>
          <i style={{ background: sysColor }} /> Systolic
        </span>
        <span>
          <i style={{ background: diaColor }} /> Diastolic
        </span>
        <span>
          <i style={{ background: hrColor }} /> HR
        </span>
      </div>
    </>
  );
}

function VitalsLogCard({ today }: { today: string }) {
  const { post, state } = useApp();
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<VitalsPeriod>("am");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const recent = useMemo(() => vitalsSorted(state).slice(0, 40), [state]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await post("/api/vitals", {
        action: "add",
        date,
        period,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heartRate: Number(heartRate),
      });
      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/vitals", { action: "delete", id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  const canSave =
    Boolean(date) &&
    systolic.trim() !== "" &&
    diastolic.trim() !== "" &&
    heartRate.trim() !== "";

  return (
    <div className="vitals-log">
      {!open ? (
        <button
          type="button"
          className="vitals-log-open"
          onClick={() => setOpen(true)}
        >
          <span>Log blood pressure</span>
          <span className="vitals-log-plus" aria-hidden>
            +
          </span>
        </button>
      ) : (
        <div className="vitals-log-form">
          <label className="field">
            <span className="field-label">Date</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="vitals-period" role="group" aria-label="Time of day">
            <button
              type="button"
              className={period === "am" ? "vitals-period-btn on" : "vitals-period-btn"}
              onClick={() => setPeriod("am")}
            >
              AM
            </button>
            <button
              type="button"
              className={period === "pm" ? "vitals-period-btn on" : "vitals-period-btn"}
              onClick={() => setPeriod("pm")}
            >
              PM
            </button>
          </div>
          <div className="vitals-nums">
            <label className="field">
              <span className="field-label">Systolic</span>
              <input
                type="number"
                inputMode="numeric"
                min={70}
                max={250}
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="mmHg"
              />
            </label>
            <label className="field">
              <span className="field-label">Diastolic</span>
              <input
                type="number"
                inputMode="numeric"
                min={40}
                max={150}
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="mmHg"
              />
            </label>
            <label className="field">
              <span className="field-label">HR</span>
              <input
                type="number"
                inputMode="numeric"
                min={30}
                max={220}
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="bpm"
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <PrimaryButton onClick={save} disabled={busy || !canSave}>
            {busy ? "Saving…" : "Save reading"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </SecondaryButton>
        </div>
      )}

      {recent.length > 0 && (
        <div className="vitals-history">
          <button
            type="button"
            className="vitals-history-toggle"
            aria-expanded={listOpen}
            onClick={() => setListOpen((v) => !v)}
          >
            <span>All readings ({recent.length})</span>
            <span className={listOpen ? "caret open" : "caret"} aria-hidden>
              ▾
            </span>
          </button>
          {listOpen && (
            <ul className="vitals-recent">
              {recent.map((r) => (
                <li key={r.id} className="vitals-recent-row">
                  <div>
                    <p className="vitals-recent-date">
                      {formatTrendDate(r.date)} · {r.period.toUpperCase()}
                    </p>
                    <p className="vitals-recent-vals">{formatVitalsReading(r)}</p>
                  </div>
                  <button
                    type="button"
                    className="vitals-recent-del"
                    disabled={busy}
                    onClick={() => void remove(r.id)}
                    aria-label="Delete reading"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function JourneyPage() {
  const { state, today } = useApp();

  return (
    <main className="stack fade-in">
      <header className="hero-day">
        <h1>Health</h1>
        <p className="muted">Sleep first. Blood pressure when you need it.</p>
      </header>

      <section className="panel health-primary">
        <p className="eyebrow">Primary</p>
        <h2 style={{ marginBottom: 10 }}>Sleep quality</h2>
        {today && <SleepQualityChart state={state} today={today} />}
      </section>

      <section className="panel health-secondary">
        <p className="eyebrow">Vitals</p>
        <h2 style={{ marginBottom: 10 }}>Blood pressure</h2>
        {today && (
          <>
            <BloodPressureViz state={state} today={today} />
            <div style={{ marginTop: 16 }}>
              <VitalsLogCard today={today} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
