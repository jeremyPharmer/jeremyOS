"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  BodyMind,
  BriefingTasks,
  ThisDayInHistory,
  WeatherExpanded,
  WorldHeadlines,
  type BriefingTaskRow,
} from "@/components/DailyBriefingSections";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import {
  sevenDayTrendInsight,
  thisDayInHistory,
  workoutGapInsight,
} from "@/lib/briefing";
import {
  buildMorningBriefing,
  type BriefingEvent,
  type BriefingScores,
  type BriefingTask,
  type BriefingWeather,
} from "@/lib/morning-briefing";
import type { NewsHeadline } from "@/lib/news";
import { quoteById } from "@/lib/quotes";
import { openTodosOn, upcomingTodos } from "@/lib/todos";
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
  const [news, setNews] = useState<NewsHeadline[]>([]);
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

  const briefingTasks: BriefingTask[] = useMemo(() => {
    const open = openTodosOn(state.dayProvisions ?? [], today).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      snoozedAhead: false as const,
    }));
    const snoozed = upcomingTodos(state.dayProvisions ?? [], today)
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        snoozedAhead: true as const,
      }));
    return [...open, ...snoozed];
  }, [state.dayProvisions, today]);

  const expandedTasks: BriefingTaskRow[] = useMemo(() => {
    const open = openTodosOn(state.dayProvisions ?? [], today).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      group: t.group,
      meta: undefined as string | undefined,
    }));
    const ahead = upcomingTodos(state.dayProvisions ?? [], today)
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        group: t.group,
        meta: "Ahead",
      }));
    return [...open, ...ahead];
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
        const [weatherRes, calRes, newsRes] = await Promise.all([
          fetch(`/api/weather?${weatherQs.toString()}`),
          fetch(`/api/calendar/work?date=${encodeURIComponent(today)}`),
          fetch(`/api/news?date=${encodeURIComponent(today)}`),
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

        if (newsRes.ok) {
          const data = (await newsRes.json()) as {
            headlines?: NewsHeadline[];
          };
          setNews((data.headlines ?? []).slice(0, 5));
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
      <main className="stack fade-in daily-briefing morning-brief">
        <header className="daily-briefing-header">
          <p className="eyebrow">Daily briefing</p>
          <h1 className="daily-briefing-title">Open</h1>
        </header>

        {shownIntention ? (
          <p className="morning-brief-focus morning-brief-focus-soft">
            You&apos;re aiming to do well at: <strong>{shownIntention}</strong>
          </p>
        ) : null}

        {quote ? (
          <blockquote className="morning-brief-quote morning-brief-quote-soft">
            <p className="morning-brief-quote-text">&ldquo;{quote.text}&rdquo;</p>
            <footer className="morning-brief-quote-attr">
              — {quote.attribution}
            </footer>
          </blockquote>
        ) : null}

        <WeatherExpanded
          mode="today"
          locationLabel={weatherLocation}
          days={weatherDays}
          focusDate={today}
          loading={briefingLoading}
        />

        <section className="morning-brief-letter" aria-live="polite">
          {briefingLoading && events.length === 0 && !thinWeather ? (
            <p className="muted morning-brief-loading">
              Pulling calendar and open windows…
            </p>
          ) : (
            <>
              <article className="morning-brief-chapter">
                <p className="morning-brief-lead">
                  {briefing.calendarStory.lead}
                </p>
                {briefing.calendarStory.items.length > 0 ? (
                  <ul className="morning-brief-agenda">
                    {briefing.calendarStory.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </article>

              <article className="morning-brief-chapter morning-brief-chapter-plan">
                <p className="morning-brief-lead">{briefing.planStory.lead}</p>
                {briefing.planStory.items.length > 0 ? (
                  <ul className="morning-brief-agenda morning-brief-agenda-plan">
                    {briefing.planStory.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </article>

              {briefing.leftoverNote ? (
                <p className="morning-brief-aside">{briefing.leftoverNote}</p>
              ) : null}

              <p className="morning-brief-pulse">{briefing.opener}</p>
            </>
          )}
        </section>

        <ThisDayInHistory today={today} entries={historyEntries} />
        <WorldHeadlines headlines={news} loading={briefingLoading} />
        <BriefingTasks tasks={expandedTasks} />
        <BodyMind workouts={workoutGaps} trends={trends} />

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main className="stack fade-in daily-briefing">
      <p className="eyebrow">Daily briefing</p>
      <h1>Open</h1>
      <p className="muted">Check in first — then your briefing. About a minute.</p>

      <section className="panel">
        <p className="eyebrow">Sleep</p>
        <TapScale
          label="Hours slept"
          value={sleepHours}
          onChange={setSleepHours}
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
