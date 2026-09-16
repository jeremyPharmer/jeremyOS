"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  BodyMind,
  BriefingTasks,
  PaperTimetable,
  ThisDayInHistory,
  WeatherExpanded,
  type BriefingTaskRow,
} from "@/components/DailyBriefingSections";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import {
  sevenDayTrendInsight,
  thisDayInHistory,
  workoutGapInsight,
} from "@/lib/briefing";
import { formatHomeHeaderDate } from "@/lib/journey";
import {
  buildMorningBriefing,
  type BriefingEvent,
  type BriefingScores,
  type BriefingTask,
  type BriefingWeather,
} from "@/lib/morning-briefing";
import { quoteById } from "@/lib/quotes";
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
  const quote = useMemo(
    () => quoteById(todayMorning?.quoteId),
    [todayMorning?.quoteId],
  );
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
    return dueTodosOn(state.dayProvisions ?? [], today).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      group: t.group,
      meta: undefined as string | undefined,
    }));
  }, [state.dayProvisions, today]);

  const historyEntries = useMemo(
    () => thisDayInHistory(state.journals ?? [], today),
    [state.journals, today],
  );
  const workoutGaps = useMemo(
    () => workoutGapInsight(state.workouts, today),
    [state.workouts, today],
  );
  const trends = useMemo(
    () => sevenDayTrendInsight(state, today),
    [state, today],
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
        const weatherQs = new URLSearchParams({ days: "5" });
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
        if (!cancelled) setBriefingLoading(false);
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
      <main className="stack fade-in daily-briefing morning-brief paper-edition">
        <header className="paper-masthead">
          <p className="paper-masthead-flag">Morning edition</p>
          <h1 className="paper-masthead-title">The Daily Open</h1>
          <div className="paper-masthead-rule" aria-hidden />
          <p className="paper-masthead-dateline">
            <span>{editionDate}</span>
            <span className="paper-masthead-dot" aria-hidden>
              ·
            </span>
            <span>Your day, delivered</span>
          </p>
        </header>

        {shownIntention ? (
          <section className="paper-front" aria-label="Today's aim">
            <p className="paper-kicker">Above the fold</p>
            <h2 className="paper-headline">{shownIntention}</h2>
            {quote ? (
              <p className="paper-deck">
                &ldquo;{quote.text}&rdquo;
                <cite className="paper-deck-attr"> — {quote.attribution}</cite>
              </p>
            ) : null}
          </section>
        ) : quote ? (
          <section className="paper-front" aria-label="Quote">
            <p className="paper-kicker">Morning line</p>
            <blockquote className="paper-quote">
              <p>&ldquo;{quote.text}&rdquo;</p>
              <footer>— {quote.attribution}</footer>
            </blockquote>
          </section>
        ) : null}

        <div className="paper-pages">
          <section className="paper-section" aria-live="polite">
            <p className="paper-kicker">The day ahead</p>
            {briefingLoading && events.length === 0 && !thinWeather ? (
              <p className="muted paper-loading">
                Pulling calendar and open windows…
              </p>
            ) : (
              <>
                <p className="paper-lead">{briefing.calendarStory.lead}</p>
                <PaperTimetable rows={briefing.calendarStory.rows} />

                {briefing.planStory.rows.length > 0 ? (
                  <>
                    <p className="paper-subhead">Open windows</p>
                    <PaperTimetable rows={briefing.planStory.rows} />
                  </>
                ) : briefing.planStory.lead ? (
                  <p className="paper-byline">{briefing.planStory.lead}</p>
                ) : null}

                {briefing.leftoverNote ? (
                  <p className="paper-aside">{briefing.leftoverNote}</p>
                ) : null}
              </>
            )}
          </section>

          {(briefingLoading || weatherDays.length > 0) && (
            <WeatherExpanded
              mode="today"
              locationLabel={weatherLocation}
              days={weatherDays}
              focusDate={today}
              loading={briefingLoading}
            />
          )}

          <BriefingTasks
            tasks={expandedTasks}
            kicker="The list"
            hideWhenEmpty
          />
          <ThisDayInHistory
            today={today}
            entries={historyEntries}
            hideWhenEmpty
          />
          <BodyMind workouts={workoutGaps} trends={trends} />
        </div>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main className="stack fade-in daily-briefing paper-edition">
      <header className="paper-masthead paper-masthead-compact">
        <p className="paper-masthead-flag">Morning edition</p>
        <h1 className="paper-masthead-title">The Daily Open</h1>
        <div className="paper-masthead-rule" aria-hidden />
        <p className="paper-masthead-dateline">
          <span>{editionDate}</span>
          <span className="paper-masthead-dot" aria-hidden>
            ·
          </span>
          <span>Check in, then the paper</span>
        </p>
      </header>

      <p className="muted paper-checkin-note">About a minute.</p>

      <section className="panel">
        <p className="eyebrow">Sleep</p>
        <TapScale
          label="Hours slept"
          value={sleepHours}
          onChange={setSleepHours}
          min={4}
          max={12}
          step={0.5}
        />
        <TapScale
          label="Sleep quality"
          value={sleepQuality}
          onChange={setSleepQuality}
        />
      </section>

      <section className="panel">
        <p className="eyebrow">Current state</p>
        <TapScale label="Mood" value={mood} onChange={setMood} />
        <TapScale label="Energy" value={energy} onChange={setEnergy} />
        <TapScale label="Stress" value={stress} onChange={setStress} />
      </section>

      <section className="panel">
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
