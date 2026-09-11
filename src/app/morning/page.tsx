"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import {
  buildMorningBriefing,
  type BriefingEvent,
  type BriefingScores,
  type BriefingTask,
  type BriefingWeather,
} from "@/lib/morning-briefing";
import { quoteById } from "@/lib/quotes";
import { openTodosOn, upcomingTodos } from "@/lib/todos";
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

  const [weather, setWeather] = useState<BriefingWeather>(null);
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

  const briefing = useMemo(
    () =>
      buildMorningBriefing({
        scores: liveScores,
        weather,
        events,
        tasks: briefingTasks,
      }),
    [liveScores, weather, events, briefingTasks],
  );

  useEffect(() => {
    if (!morningDone) return;
    let cancelled = false;

    async function loadBriefingContext() {
      setBriefingLoading(true);
      try {
        const coords = readStoredCoords();
        const weatherQs = new URLSearchParams();
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
            days?: Array<{
              date: string;
              label: string;
              highF: number;
              lowF: number;
              precipChancePct: number;
            }>;
          };
          const day =
            data.days?.find((d) => d.date === today) ?? data.days?.[0];
          if (day) {
            setWeather({
              label: day.label,
              highF: day.highF,
              lowF: day.lowF,
              precipChancePct: day.precipChancePct,
            });
          }
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
      <main className="stack fade-in morning-brief morning-brief-converse">
        <header className="morning-brief-header">
          <p className="eyebrow">Morning brief</p>
          <h1 className="morning-brief-title">Here&apos;s the shape of today</h1>
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

        <section className="morning-brief-letter" aria-live="polite">
          {briefingLoading && !weather && events.length === 0 ? (
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

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main className="stack fade-in">
      <p className="eyebrow">Prepare</p>
      <h1>Start the day</h1>
      <p className="muted">Tap how you&apos;re landing — about a minute.</p>

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
