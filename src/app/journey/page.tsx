"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  CONDITION_METRICS,
  filledTrendPointsInRange,
  formatTrendDate,
  resolveConditionRange,
  type ConditionMetric,
  type ConditionRangePreset,
} from "@/lib/trends";
import type { RebuildState, VitalsPeriod } from "@/lib/types";
import {
  VITALS_METRICS,
  filledVitalsPointsInRange,
  formatVitalsReading,
  vitalsSorted,
  type VitalsAxis,
  type VitalsMetric,
} from "@/lib/vitals";

type ChartAxis = "scale" | "hours" | VitalsAxis;

const AXIS_SPECS: Record<
  ChartAxis,
  { min: number; max: number; ticks: number[] }
> = {
  scale: { min: 1, max: 10, ticks: [1, 4, 7, 10] },
  hours: { min: 0, max: 14, ticks: [0, 7, 14] },
  bp: { min: 60, max: 180, ticks: [60, 100, 140, 180] },
  hr: { min: 40, max: 120, ticks: [40, 80, 120] },
};

function LineChartFrame({
  width = 320,
  height = 180,
  points,
  series,
  rangeStart,
  rangeEnd,
  emptyMessage,
  footer,
}: {
  width?: number;
  height?: number;
  points: { date: string }[];
  series: {
    key: string;
    color: string;
    axis: ChartAxis;
    values: (number | undefined)[];
  }[];
  rangeStart: string;
  rangeEnd: string;
  emptyMessage: string;
  footer?: string;
}) {
  const axesUsed = [...new Set(series.map((s) => s.axis))];
  const leftAxis: ChartAxis = axesUsed[0] ?? "scale";
  const rightAxis: ChartAxis | null =
    axesUsed.length > 1
      ? axesUsed.find((a) => a !== leftAxis) ?? null
      : null;
  const pad = {
    top: 16,
    right: rightAxis ? 28 : 12,
    bottom: 28,
    left: 28,
  };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xSpan = Math.max(points.length - 1, 1);

  function yCoord(value: number, axis: ChartAxis): number {
    const spec = AXIS_SPECS[axis];
    const span = Math.max(spec.max - spec.min, 1);
    return pad.top + innerH - ((value - spec.min) / span) * innerH;
  }

  const xs = points.map((_, i) =>
    points.length === 1
      ? pad.left + innerW / 2
      : pad.left + (i / xSpan) * innerW,
  );

  const paths = series
    .map((s) => {
      const segments: { x: number; y: number }[][] = [];
      let current: { x: number; y: number }[] = [];
      for (let i = 0; i < s.values.length; i++) {
        const v = s.values[i];
        if (v === undefined) {
          if (current.length > 0) {
            segments.push(current);
            current = [];
          }
          continue;
        }
        current.push({ x: xs[i]!, y: yCoord(v, s.axis) });
      }
      if (current.length > 0) segments.push(current);
      if (segments.length === 0) return null;
      const d = segments
        .map((coords) =>
          coords
            .map(
              (c, i) =>
                `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
            )
            .join(" "),
        )
        .join(" ");
      const coords = segments.flat();
      return { ...s, d, coords };
    })
    .filter(Boolean) as {
    key: string;
    color: string;
    d: string;
    coords: { x: number; y: number }[];
  }[];

  const first = rangeStart;
  const last = rangeEnd;

  if (points.length === 0) {
    return (
      <p className="muted" style={{ marginTop: 12 }}>
        {emptyMessage}
      </p>
    );
  }

  const axisLeft = pad.left;
  const axisRight = width - pad.right;
  const axisY = height - 10;
  const leftTicks = AXIS_SPECS[leftAxis].ticks;
  const rightTicks = rightAxis ? AXIS_SPECS[rightAxis].ticks : [];

  return (
    <>
      <svg
        key={`${rangeStart}-${rangeEnd}-${points.length}`}
        className="trend-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Trend chart"
      >
        {leftTicks.map((v) => {
          const y = yCoord(v, leftAxis);
          return (
            <g key={`left-${v}`}>
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
        {rightTicks.map((v) => {
          const y = yCoord(v, rightAxis!);
          return (
            <text
              key={`right-${v}`}
              x={width - 4}
              y={y + 3}
              textAnchor="end"
              className="trend-axis"
            >
              {v}
            </text>
          );
        })}
        <line
          x1={axisLeft}
          x2={axisRight}
          y1={axisY}
          y2={axisY}
          className="trend-axis-line"
        />
        {paths.map((p) => (
          <g key={p.key}>
            <path d={p.d} fill="none" stroke={p.color} strokeWidth="2.25" />
            {p.coords.map((c, i) => (
              <circle
                key={`${p.key}-${i}`}
                cx={c.x}
                cy={c.y}
                r="3.2"
                fill={p.color}
              />
            ))}
          </g>
        ))}
        {first && (
          <text x={axisLeft} y={height - 8} className="trend-axis">
            {formatTrendDate(first)}
          </text>
        )}
        {last && last !== first && (
          <text
            x={axisRight}
            y={height - 8}
            textAnchor="end"
            className="trend-axis"
          >
            {formatTrendDate(last)}
          </text>
        )}
      </svg>
      {footer && (
        <p className="tiny" style={{ marginTop: 8 }}>
          {footer}
        </p>
      )}
    </>
  );
}

const RANGE_OPTIONS: { key: ConditionRangePreset; label: string }[] = [
  { key: "30", label: "30 days" },
  { key: "60", label: "60 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
];

function ConditionsChart({
  state,
  today,
  journeyStart,
}: {
  state: RebuildState;
  today: string;
  journeyStart: string;
}) {
  const [preset, setPreset] = useState<ConditionRangePreset>("all");
  const [customStart, setCustomStart] = useState(journeyStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [active, setActive] = useState<Record<ConditionMetric, boolean>>({
    sleepHours: true,
    sleepQuality: true,
    mood: true,
    energy: true,
    stress: true,
  });

  function toggle(key: ConditionMetric) {
    setActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectPreset(next: ConditionRangePreset) {
    setPreset(next);
    if (next === "custom") {
      const bounds = resolveConditionRange(preset, journeyStart, today, {
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
        journeyStart,
        today,
        preset === "custom" ? { start: customStart, end: customEnd } : undefined,
      ),
    [preset, journeyStart, today, customStart, customEnd],
  );

  const points = useMemo(
    () => filledTrendPointsInRange(state, range.start, range.end),
    [state, range.start, range.end],
  );

  const series = CONDITION_METRICS.filter((m) => active[m.key]).map((m) => ({
    key: m.key,
    color: m.color,
    axis: m.axis as ChartAxis,
    values: points.map((p) => p[m.key]),
  }));

  return (
    <div className="trends">
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
              min={journeyStart}
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
      <div className="trend-toggles">
        {CONDITION_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={active[m.key] ? "trend-toggle on" : "trend-toggle"}
            style={{ ["--trend" as string]: m.color }}
            onClick={() => toggle(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <LineChartFrame
        points={points}
        series={series}
        rangeStart={range.start}
        rangeEnd={range.end}
        emptyMessage="Trends appear as you log mornings."
        footer="Sleep, quality, mood, energy, stress (1–10). Tap to show or hide."
      />
    </div>
  );
}

function VitalsChart({
  state,
  today,
  journeyStart,
}: {
  state: RebuildState;
  today: string;
  journeyStart: string;
}) {
  const [preset, setPreset] = useState<ConditionRangePreset>("30");
  const [customStart, setCustomStart] = useState(journeyStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [active, setActive] = useState<Record<VitalsMetric, boolean>>({
    systolic: true,
    diastolic: true,
    heartRate: true,
  });

  function toggle(key: VitalsMetric) {
    setActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectPreset(next: ConditionRangePreset) {
    setPreset(next);
    if (next === "custom") {
      const bounds = resolveConditionRange(preset, journeyStart, today, {
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
        journeyStart,
        today,
        preset === "custom" ? { start: customStart, end: customEnd } : undefined,
      ),
    [preset, journeyStart, today, customStart, customEnd],
  );

  const points = useMemo(
    () => filledVitalsPointsInRange(state, range.start, range.end),
    [state, range.start, range.end],
  );

  const series = VITALS_METRICS.filter((m) => active[m.key]).map((m) => ({
    key: m.key,
    color: m.color,
    axis: m.axis as ChartAxis,
    values: points.map((p) => p[m.key]),
  }));

  return (
    <div className="trends">
      <div className="trend-range-toggles" role="group" aria-label="Vitals range">
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
              min={journeyStart}
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
      <div className="trend-toggles">
        {VITALS_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={active[m.key] ? "trend-toggle on" : "trend-toggle"}
            style={{ ["--trend" as string]: m.color }}
            onClick={() => toggle(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <LineChartFrame
        points={points}
        series={series}
        rangeStart={points[0]?.date ?? range.start}
        rangeEnd={points[points.length - 1]?.date ?? range.end}
        emptyMessage="Log a reading to see vitals over time."
        footer="Systolic / diastolic (mmHg) · HR (bpm). Neutral log — no targets."
      />
    </div>
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

  const recent = useMemo(() => vitalsSorted(state).slice(0, 8), [state]);

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
  );
}

export default function JourneyPage() {
  const { state, dashboard, today } = useApp();
  const journeyStart =
    state.profile?.currentRunStartedOn ??
    state.profile?.startDate ??
    today ??
    "";

  return (
    <main className="stack fade-in">
      <header className="hero-day">
        <p className="eyebrow">Journey</p>
        <h1>{dashboard?.label ?? "Journey"}</h1>
      </header>

      <section className="panel">
        <p className="eyebrow">Objective</p>
        <h2 style={{ marginBottom: 10 }}>Blood pressure</h2>
        {today && <VitalsLogCard today={today} />}
      </section>

      <section className="panel">
        <p className="eyebrow">Over time</p>
        <h2 style={{ marginBottom: 10 }}>Vitals</h2>
        {today && journeyStart && (
          <VitalsChart
            state={state}
            today={today}
            journeyStart={journeyStart}
          />
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">Over time</p>
        <h2 style={{ marginBottom: 10 }}>Conditions</h2>
        {today && journeyStart && (
          <ConditionsChart
            state={state}
            today={today}
            journeyStart={journeyStart}
          />
        )}
      </section>
    </main>
  );
}
