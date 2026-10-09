"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, TapScale } from "@/components/ui";
import {
  thisDayInHistory,
  thisDayInHistoryTitle,
} from "@/lib/briefing";
import {
  applyCalendarTitleOverrides,
  calendarHiddenEventIds,
  calendarTitleOverrides,
  filterHiddenCalendarEvents,
} from "@/lib/calendar-overrides";
import { formatHomeHeaderDate } from "@/lib/journey";
import {
  dayAheadProse,
  weatherPeriodPhrases,
} from "@/lib/open-day-prose";
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

export default function MorningPage() {
  const { post, state, today, refresh } = useApp();
  const router = useRouter();

  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [weatherDays, setWeatherDays] = useState<DailyForecast[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [events, setEvents] = useState<
    {
      id: string;
      title: string;
      startTime: string;
      endTime?: string;
      allDay?: boolean;
    }[]
  >([]);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const todayMorning = state.mornings.find((m) => m.date === today);
  const editionDate = formatHomeHeaderDate(today);

  const historyEntries = useMemo(
    () => thisDayInHistory(state.journals ?? [], today),
    [state.journals, today],
  );

  const todayWeather = useMemo(
    () => weatherDays.find((d) => d.date === today) ?? weatherDays[0],
    [weatherDays, today],
  );

  const weatherPhrases = useMemo(
    () => weatherPeriodPhrases(todayWeather, weatherLocation),
    [todayWeather, weatherLocation],
  );

  const tasks = useMemo(
    () =>
      dueTodosOn(state.dayProvisions ?? [], today).map((t) => ({
        label: t.label,
        time: t.time,
      })),
    [state.dayProvisions, today],
  );

  const dayProse = useMemo(
    () =>
      dayAheadProse({
        events: events.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
        })),
        tasks,
      }),
    [events, tasks],
  );

  // Already opened today → Home (Open is a once-per-day gate).
  useEffect(() => {
    if (todayMorning) {
      router.replace("/");
    }
  }, [todayMorning, router]);

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
          const hidden = calendarHiddenEventIds(state);
          const titled = applyCalendarTitleOverrides(
            data.events ?? [],
            calendarTitleOverrides(state),
          );
          setEvents(
            filterHiddenCalendarEvents(titled, hidden).map((e) => ({
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

    if (today) void loadBriefingContext();
    return () => {
      cancelled = true;
    };
  }, [today, state]);

  async function submit() {
    const focusLine = focus.trim();
    if (!focusLine) {
      setError("Add one thing you’ll focus on today.");
      return;
    }
    if (sleepQuality == null) {
      setError("Tap a sleep quality from 1 to 5.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/morning", {
        sleepQuality,
        intention: focusLine,
      });
      await refresh();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save");
    } finally {
      setBusy(false);
    }
  }

  if (todayMorning) {
    return (
      <main className="stack">
        <p className="muted">Opening Home…</p>
      </main>
    );
  }

  return (
    <main className="stack fade-in open-edition">
      <header className="open-edition-mast">
        <p className="open-edition-flag">{editionDate} · Morning edition</p>
        <h1 className="open-edition-title">The Daily Open</h1>
        <div className="open-edition-rule" aria-hidden />
      </header>

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
            min={1}
            max={5}
          />
        </div>

        <label className="open-edition-lead-field">
          <span className="open-edition-kicker">
            One thing I will focus on today
          </span>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="One short line"
          />
        </label>

        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

        <PrimaryButton
          onClick={submit}
          disabled={busy || !focus.trim() || sleepQuality == null}
        >
          {busy ? "Saving…" : "Start the day"}
        </PrimaryButton>
      </section>

      <div className="open-edition-paper open-edition-paper-live">
        {historyEntries.length > 0 ? (
          <section className="open-edition-story" aria-label="On this date">
            <p className="open-edition-kicker">
              {thisDayInHistoryTitle(today)}
            </p>
            <ul className="open-history-list">
              {historyEntries.map((entry) => (
                <li key={entry.date} className="open-history-item">
                  <span className="open-history-year">{entry.year}</span>
                  <div>
                    {entry.headline ? (
                      <p className="open-history-headline">{entry.headline}</p>
                    ) : null}
                    {entry.summary ? (
                      <p className="open-history-summary">{entry.summary}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="open-edition-story" aria-label="Weather">
          <p className="open-edition-kicker">Today</p>
          {briefingLoading && !todayWeather ? (
            <p className="muted tiny">Pulling weather…</p>
          ) : weatherPhrases ? (
            <>
              <p className="open-edition-cal-lead">{weatherPhrases.summary}</p>
              <dl className="open-weather-periods">
                <div>
                  <dt>Morning</dt>
                  <dd>{weatherPhrases.morning}</dd>
                </div>
                <div>
                  <dt>Afternoon</dt>
                  <dd>{weatherPhrases.afternoon}</dd>
                </div>
                <div>
                  <dt>Evening</dt>
                  <dd>{weatherPhrases.evening}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="muted tiny">Forecast unavailable right now.</p>
          )}
        </section>

        <section className="open-edition-story" aria-label="Day ahead">
          <p className="open-edition-kicker">Day ahead</p>
          {briefingLoading && events.length === 0 && tasks.length === 0 ? (
            <p className="muted tiny">Pulling calendar…</p>
          ) : (
            <p className="open-day-prose">{dayProse}</p>
          )}
        </section>
      </div>
    </main>
  );
}
