"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  BriefingTasks,
  PaperTimetable,
  WeatherExpanded,
  type BriefingTaskRow,
} from "@/components/DailyBriefingSections";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import { workoutGapInsight } from "@/lib/briefing";
import { formatHomeHeaderDate } from "@/lib/journey";
import {
  buildMorningBriefing,
  type BriefingEvent,
  type BriefingScores,
  type BriefingTask,
  type BriefingWeather,
} from "@/lib/morning-briefing";
import { dueTodosOn } from "@/lib/todos";
import type { DailyForecast } from "@/lib/weather";
import type { WorkCalendarEvent } from "@/lib/work-calendar";

const COORDS_KEY = "rebuild-weather-coords";

type StoredCoords = {
  lat: number;
  lon: number;
  label: string;
};

function readStoredCoords(): StoredCoords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCoords;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      typeof parsed.label === "string"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function scoresFromMorning(m: {
  sleepHours: number;
  sleepQuality: number;
  mood: number;
  energy: number;
  stress: number;
}): BriefingScores {
  return {
    sleepHours: m.sleepHours,
    sleepQuality: m.sleepQuality,
    mood: m.mood,
    energy: m.energy,
    stress: m.stress,
  };
}

/** Home / morning-timed tasks float to the top as “start the day”. */
function sortStartTasks(tasks: BriefingTaskRow[]): BriefingTaskRow[] {
  return [...tasks].sort((a, b) => {
    const aHome = a.group === "home" ? 0 : 1;
    const bHome = b.group === "home" ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    const aTime = a.time ? 0 : 1;
    const bTime = b.time ? 0 : 1;
    if (aTime !== bTime) return aTime - bTime;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

export default function MorningPage() {
  const { post, state, today, refresh } = useApp();
  const router = useRouter();
  const timezone = state.profile?.timezone ?? "America/New_York";

  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [intention, setIntention] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [weatherDays, setWeatherDays] = useState<DailyForecast[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [events, setEvents] = useState<BriefingEvent[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const todayMorning = state.mornings.find((m) => m.date === today);
  const shownIntention =
    intention.trim() || todayMorning?.intention?.trim() || "";
  /** Morning already saved for today (or just submitted this session). */
  const morningDone = Boolean(todayMorning) || done;
  const editionDate = formatHomeHeaderDate(today);

  const briefingTasks: BriefingTask[] = useMemo(() => {
    return dueTodosOn(state.dayProvisions ?? [], today).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      snoozedAhead: false as const,
    }));
  }, [state.dayProvisions, today]);

  const expandedTasks: BriefingTaskRow[] = useMemo(() => {
    return sortStartTasks(
      dueTodosOn(state.dayProvisions ?? [], today).map((t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        group: t.group,
        meta: undefined as string | undefined,
      })),
    );
  }, [state.dayProvisions, today]);

  const workoutGaps = useMemo(
    () => workoutGapInsight(state.workouts, today),
    [state.workouts, today],
  );

  const scalesReady =
    sleepHours != null &&
    sleepQuality != null &&
    mood != null &&
    energy != null &&
    stress != null;

  const liveScores: BriefingScores = useMemo(() => {
    if (todayMorning) return scoresFromMorning(todayMorning);
    if (!scalesReady) {
      return {
        sleepHours: 5,
        sleepQuality: 5,
        mood: 5,
        energy: 5,
        stress: 5,
      };
    }
    return {
      sleepHours,
      sleepQuality,
      mood,
      energy,
      stress,
    };
  }, [todayMorning, scalesReady, sleepHours, sleepQuality, mood, energy, stress]);

  const thinWeather: BriefingWeather = useMemo(() => {
    const day = weatherDays.find((d) => d.date === today) ?? weatherDays[0];
    if (!day) return null;
    return {
      label: day.label,
      highF: day.highF,
      lowF: day.lowF,
      precipChancePct: day.precipChancePct,
    };
  }, [weatherDays, today]);

  const briefing = useMemo(
    () =>
      buildMorningBriefing({
        scores: liveScores,
        weather: thinWeather,
        events,
        tasks: briefingTasks,
      }),
    [liveScores, thinWeather, events, briefingTasks],
  );

  useEffect(() => {
    if (!morningDone) return;
    let cancelled = false;

    async function loadBriefingContext() {
      setBriefingLoading(true);
      try {
        const coords = readStoredCoords();
        const weatherQs = new URLSearchParams({ days: "2" });
        if (coords) {
          weatherQs.set("lat", String(coords.lat));
          weatherQs.set("lon", String(coords.lon));
          if (coords.label && coords.label !== "Near you") {
            weatherQs.set("label", coords.label);
          }
        }
        const [weatherRes, calRes] = await Promise.all([
          fetch(`/api/weather?${weatherQs.toString()}`),
          fetch(`/api/calendar/work?date=${encodeURIComponent(today)}`),
        ]);
        if (cancelled) return;

        if (weatherRes.ok) {
          const data = (await weatherRes.json()) as {
            locationLabel?: string;
            days?: DailyForecast[];
          };
          setWeatherDays(data.days ?? []);
          setWeatherLocation(data.locationLabel ?? "");
        }

        if (calRes.ok) {
          const data = (await calRes.json()) as {
            events?: WorkCalendarEvent[];
          };
          setEvents(
            (data.events ?? []).map((e) => ({
              id: e.id,
              title: e.title,
              startTime: e.startTime,
              endTime: e.endTime,
              allDay: e.allDay,
            })),
          );
        }
      } catch {
        /* briefing still works with partial context */
      } finally {
        if (!cancelled) {
          setBriefingLoading(false);
        }
      }
    }

    void loadBriefingContext();
    return () => {
      cancelled = true;
    };
  }, [morningDone, today, timezone]);

  async function submit() {
    const focus = intention.trim();
    if (!focus) {
      setError("Add the one thing you want to do well today.");
      return;
    }
    if (
      sleepHours == null ||
      sleepQuality == null ||
      mood == null ||
      energy == null ||
      stress == null
    ) {
      setError("Tap a number for each scale.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setDone(true);
      await post("/api/morning", {
        date: today,
        sleepHours,
        sleepQuality,
        mood,
        energy,
        stress,
        intention: focus,
      });
      await refresh();
    } catch (e) {
      setDone(false);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (morningDone) {
    return (
      <main className="stack fade-in open-river">
        <header className="open-river-mast">
          <p className="open-river-flag">{editionDate} · Open</p>
          <h1 className="open-river-title">Morning</h1>
        </header>

        <div className="open-river-grid">
          <div className="open-river-main">
            {shownIntention ? (
              <section
                className="open-river-tile open-river-commit"
                id="commitment"
                aria-label="Do well today"
              >
                <div className="open-river-sec-head">
                  <p className="open-river-kicker">Do well today</p>
                </div>
                <h2 className="open-river-commit-text">{shownIntention}</h2>
              </section>
            ) : null}

            <div className="open-river-tile open-river-tasks-wrap">
              <BriefingTasks
                tasks={expandedTasks}
                kicker="Start the day"
                linkHref="/items"
                linkLabel="Tasks →"
                hideWhenEmpty={false}
                emptyLabel="Nothing queued to start — add one on Tasks."
              />
            </div>
          </div>

          <div className="open-river-side">
            <section
              className="open-river-tile open-river-cal"
              id="calendar"
              aria-live="polite"
              aria-label="Calendar"
            >
              <div className="open-river-sec-head">
                <p className="open-river-kicker">Calendar</p>
                <Link className="open-river-jump" href="/">
                  Home →
                </Link>
              </div>
              {briefingLoading && events.length === 0 ? (
                <p className="muted tiny">Pulling calendar…</p>
              ) : (
                <>
                  <p className="open-river-cal-lead">
                    {briefing.calendarStory.lead}
                  </p>
                  <PaperTimetable rows={briefing.calendarStory.rows} />
                  {briefing.calendarStory.rows.length === 0 ? (
                    <p className="muted tiny">No timed events on the books.</p>
                  ) : null}
                </>
              )}
            </section>

            <div className="open-river-tile open-river-wx-wrap">
              <WeatherExpanded
                mode="today"
                locationLabel={weatherLocation}
                days={weatherDays}
                focusDate={today}
                loading={briefingLoading}
                showRadar
              />
            </div>

            <section
              className="open-river-tile open-river-workout"
              id="workout"
              aria-label="Workout"
            >
              <div className="open-river-sec-head">
                <p className="open-river-kicker">Workout</p>
                <Link className="open-river-jump" href="/workouts">
                  Log →
                </Link>
              </div>
              <p className="open-river-wo-status">
                {workoutGaps.daysSinceAny === 0
                  ? "Moved today"
                  : workoutGaps.daysSinceAny == null
                    ? "No session yet"
                    : `${workoutGaps.daysSinceAny}d since last`}
              </p>
              <p className="open-river-wo-hint">{workoutGaps.anyLabel}</p>
            </section>
          </div>
        </div>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main className="stack fade-in open-river open-river-compose">
      <header className="open-river-mast">
        <p className="open-river-flag">{editionDate} · Open</p>
        <h1 className="open-river-title">Morning</h1>
        <p className="muted open-river-note">Check in, then your day.</p>
      </header>

      <section className="panel open-river-panel">
        <p className="eyebrow">Sleep</p>
        <TapScale
          label="Hours slept"
          value={sleepHours}
          onChange={setSleepHours}
          min={4}
          max={10}
          step={0.5}
        />
        <TapScale
          label="Sleep quality"
          value={sleepQuality}
          onChange={setSleepQuality}
        />
      </section>

      <section className="panel open-river-panel">
        <p className="eyebrow">Current state</p>
        <TapScale label="Mood" value={mood} onChange={setMood} />
        <TapScale label="Energy" value={energy} onChange={setEnergy} />
        <TapScale label="Stress" value={stress} onChange={setStress} />
      </section>

      <section className="panel open-river-panel">
        <label className="field">
          <span className="field-label">
            What&apos;s the one thing you want to do well today?
          </span>
          <input
            type="text"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="One short line"
          />
        </label>
      </section>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <PrimaryButton
        onClick={submit}
        disabled={busy || !intention.trim() || !scalesReady}
      >
        {busy ? "Saving…" : "Continue"}
      </PrimaryButton>
      <SecondaryButton onClick={() => router.push("/")}>Cancel</SecondaryButton>
    </main>
  );
}
