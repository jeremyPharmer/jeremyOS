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
import { PrimaryButton, TapScale } from "@/components/ui";
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

  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [intention, setIntention] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  /** After save (or reopen), check-in sits collapsed above the paper. */
  const [checkinOpen, setCheckinOpen] = useState(false);

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
  const showCheckin = !morningDone || checkinOpen;

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
    sleepQuality != null && mood != null && energy != null && stress != null;

  const liveScores: BriefingScores = useMemo(() => {
    if (todayMorning) return scoresFromMorning(todayMorning);
    if (!scalesReady) {
      return {
        sleepHours: 7,
        sleepQuality: 5,
        mood: 5,
        energy: 5,
        stress: 5,
      };
    }
    return {
      sleepHours: 7,
      sleepQuality,
      mood,
      energy,
      stress,
    };
  }, [todayMorning, scalesReady, sleepQuality, mood, energy, stress]);

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

  const collapsedSummary = useMemo(() => {
    const src = todayMorning
      ? {
          quality: todayMorning.sleepQuality,
          mood: todayMorning.mood,
          energy: todayMorning.energy,
          stress: todayMorning.stress,
        }
      : {
          quality: sleepQuality,
          mood,
          energy,
          stress,
        };
    if (
      src.quality == null ||
      src.mood == null ||
      src.energy == null ||
      src.stress == null
    ) {
      return null;
    }
    return `Q ${src.quality} · M ${src.mood} · E ${src.energy} · St ${src.stress}`;
  }, [todayMorning, sleepQuality, mood, energy, stress]);

  // Prefill scales when reopening an already-saved morning.
  useEffect(() => {
    if (!todayMorning || !checkinOpen) return;
    setSleepQuality(todayMorning.sleepQuality);
    setMood(todayMorning.mood);
    setEnergy(todayMorning.energy);
    setStress(todayMorning.stress);
    setIntention(todayMorning.intention ?? "");
  }, [todayMorning, checkinOpen]);

  useEffect(() => {
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
  }, [today, timezone]);

  async function submit() {
    const focus = intention.trim();
    if (!focus) {
      setError("Add the one thing you want to do well today.");
      return;
    }
    if (
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
      setCheckinOpen(false);
      await post("/api/morning", {
        date: today,
        sleepQuality,
        mood,
        energy,
        stress,
        intention: focus,
      });
      await refresh();
    } catch (e) {
      setDone(false);
      setCheckinOpen(true);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stack fade-in open-edition">
      <header className="open-edition-mast">
        <p className="open-edition-flag">{editionDate} · Morning edition</p>
        <h1 className="open-edition-title">The Daily Open</h1>
        <div className="open-edition-rule" aria-hidden />
      </header>

      {showCheckin ? (
        <section className="open-edition-box" aria-label="Morning check-in">
          <div className="open-edition-box-head">
            <p className="open-edition-kicker">Check in</p>
            <span className="open-edition-note">About a minute</span>
          </div>

          <div className="open-edition-vitals">
            <TapScale
              label="Sleep quality"
              value={sleepQuality}
              onChange={setSleepQuality}
            />
            <TapScale label="Mood" value={mood} onChange={setMood} />
            <TapScale label="Energy" value={energy} onChange={setEnergy} />
            <TapScale label="Stress" value={stress} onChange={setStress} />
          </div>

          <label className="open-edition-lead-field">
            <span className="open-edition-kicker">Do well today</span>
            <input
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="One short line"
              disabled={Boolean(todayMorning)}
            />
          </label>

          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

          {todayMorning ? (
            <PrimaryButton onClick={() => setCheckinOpen(false)}>
              Done
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={submit}
              disabled={busy || !intention.trim() || !scalesReady}
            >
              {busy ? "Saving…" : "Open the paper"}
            </PrimaryButton>
          )}
        </section>
      ) : (
        <button
          type="button"
          className="open-edition-collapsed"
          onClick={() => setCheckinOpen(true)}
          aria-label="Expand check-in"
        >
          <span className="open-edition-collapsed-lead">
            {shownIntention || "Today’s lead"}
          </span>
          {collapsedSummary ? (
            <span className="open-edition-collapsed-meta">
              {collapsedSummary}
            </span>
          ) : null}
          <span className="open-edition-collapsed-edit">Edit</span>
        </button>
      )}

      <div
        className={`open-edition-paper${
          morningDone && !checkinOpen
            ? " open-edition-paper-live"
            : " open-edition-paper-wait"
        }`}
      >
        {morningDone && shownIntention && !checkinOpen ? (
          <section className="open-edition-story open-edition-story-lead">
            <p className="open-edition-kicker">Today&apos;s lead</p>
            <h2 className="open-edition-commit">{shownIntention}</h2>
          </section>
        ) : null}

        <div className="open-edition-story open-edition-tasks-wrap">
          <BriefingTasks
            tasks={expandedTasks}
            kicker="Start the day"
            linkHref="/items"
            linkLabel="Tasks →"
            hideWhenEmpty={false}
            emptyLabel="Nothing queued to start — add one on Tasks."
          />
        </div>

        <section
          className="open-edition-story"
          id="calendar"
          aria-live="polite"
          aria-label="Calendar"
        >
          <div className="open-edition-sec-head">
            <p className="open-edition-kicker">Calendar</p>
            <Link className="open-edition-jump" href="/">
              Home →
            </Link>
          </div>
          {briefingLoading && events.length === 0 ? (
            <p className="muted tiny">Pulling calendar…</p>
          ) : (
            <>
              <p className="open-edition-cal-lead">
                {briefing.calendarStory.lead}
              </p>
              <PaperTimetable rows={briefing.calendarStory.rows} />
              {briefing.calendarStory.rows.length === 0 ? (
                <p className="muted tiny">No timed events on the books.</p>
              ) : null}
            </>
          )}
        </section>

        <div className="open-edition-pair">
          <div className="open-edition-story open-edition-wx-wrap">
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
            className="open-edition-story"
            id="workout"
            aria-label="Workout"
          >
            <div className="open-edition-sec-head">
              <p className="open-edition-kicker">Workout</p>
              <Link className="open-edition-jump" href="/workouts">
                Log →
              </Link>
            </div>
            <p className="open-edition-wo-status">
              {workoutGaps.daysSinceAny === 0
                ? "Moved today"
                : workoutGaps.daysSinceAny == null
                  ? "No session yet"
                  : `${workoutGaps.daysSinceAny}d since last`}
            </p>
            <p className="open-edition-wo-hint">{workoutGaps.anyLabel}</p>
          </section>
        </div>
      </div>

      {morningDone && !checkinOpen ? (
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      ) : null}
    </main>
  );
}
