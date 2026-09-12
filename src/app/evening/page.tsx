"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  BodyMind,
  BriefingTasks,
  ThisDayInHistory,
  WeatherExpanded,
  WorldHeadlines,
  type BriefingTaskRow,
} from "@/components/DailyBriefingSections";
import { SubtlePhotoPicker } from "@/components/SubtlePhotoPicker";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import {
  sevenDayTrendInsight,
  thisDayInHistory,
  workoutGapInsight,
} from "@/lib/briefing";
import {
  formatDisplayDate,
  isValidEveningDate,
  missingEveningDates,
  addDays,
} from "@/lib/journey";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  bundleJournalsByDate,
  countSentences,
} from "@/lib/journal";
import type { NewsHeadline } from "@/lib/news";
import { completedTodosForUndo, openTodosOn } from "@/lib/todos";
import type { DailyForecast } from "@/lib/weather";

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

type ClosedSnapshot = {
  date: string;
  headline: string;
  summary: string;
  mood: number;
  stress: number;
  photoDataUrl: string | null;
};

function EveningPageInner() {
  const { post, state, today, refresh } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("date") ?? "";

  const missing = useMemo(
    () => missingEveningDates(state, today || undefined),
    [state, today],
  );

  const preferredDate = useMemo(() => {
    if (
      requested &&
      isValidEveningDate(state, requested, today || undefined) &&
      missing.includes(requested)
    ) {
      return requested;
    }
    if (today && missing.includes(today)) return today;
    return missing[0] ?? "";
  }, [requested, state, today, missing]);

  const [closeDate, setCloseDate] = useState(preferredDate);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [oneLine, setOneLine] = useState("");
  const [standOut, setStandOut] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(false);
  const [closed, setClosed] = useState<ClosedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [news, setNews] = useState<NewsHeadline[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [weatherDays, setWeatherDays] = useState<DailyForecast[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);

  const summarySentences = countSentences(standOut);
  const summaryOver =
    standOut.trim().length > 0 &&
    summarySentences > SUMMARY_SENTENCE_SOFT_LIMIT;
  useEffect(() => {
    if (!closeDate || !missing.includes(closeDate)) {
      setCloseDate(preferredDate);
    }
  }, [preferredDate, missing, closeDate]);

  const effectiveDate =
    closeDate && missing.includes(closeDate) ? closeDate : preferredDate;

  // Prefill from a journal entry already written for this day (e.g. from /journal)
  // so Close the day does not force a blank overwrite.
  // Skip while showing success — refresh clears missing dates and would wipe
  // the local fields that used to drive the Remember headline (empty quotes).
  useEffect(() => {
    if (result) return;
    if (!effectiveDate) {
      setOneLine("");
      setStandOut("");
      setPhotoDataUrl(null);
      return;
    }
    const bundle = bundleJournalsByDate(state.journals).get(effectiveDate);
    setOneLine(bundle?.headline ?? "");
    setStandOut(bundle?.summary ?? "");
    setPhotoDataUrl(null);
    // Only re-seed when the close date changes — not on every journals refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [effectiveDate, result]);

  // On success: pull news + tomorrow weather for the Daily briefing twin.
  useEffect(() => {
    if (!result || !closed || !today) return;
    let cancelled = false;
    setNewsLoading(true);
    setWeatherLoading(true);

    (async () => {
      try {
        const coords = readStoredCoords();
        const weatherQs = new URLSearchParams({ days: "3" });
        if (coords) {
          weatherQs.set("lat", String(coords.lat));
          weatherQs.set("lon", String(coords.lon));
          if (coords.label && coords.label !== "Near you") {
            weatherQs.set("label", coords.label);
          }
        }
        const [newsRes, weatherRes] = await Promise.all([
          fetch(`/api/news?date=${encodeURIComponent(closed.date)}`),
          fetch(`/api/weather?${weatherQs.toString()}`),
        ]);
        if (cancelled) return;
        if (newsRes.ok) {
          const data = (await newsRes.json()) as {
            headlines?: NewsHeadline[];
          };
          setNews((data.headlines ?? []).slice(0, 5));
        }
        if (weatherRes.ok) {
          const data = (await weatherRes.json()) as {
            locationLabel?: string;
            days?: DailyForecast[];
          };
          setWeatherDays(data.days ?? []);
          setWeatherLocation(data.locationLabel ?? "");
        }
      } catch {
        /* fail soft — briefing still works without news/weather */
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
          setWeatherLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result, closed, today]);

  const alreadyClosedToday =
    Boolean(today) && state.evenings.some((e) => e.date === today);
  const requestedAlreadyClosed =
    Boolean(requested) && state.evenings.some((e) => e.date === requested);

  const briefingTasks: BriefingTaskRow[] = useMemo(() => {
    if (!closed) return [];
    const done = completedTodosForUndo(
      state.dayProvisions ?? [],
      closed.date,
    ).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      group: t.group,
      status: "done" as const,
    }));
    const open = openTodosOn(state.dayProvisions ?? [], closed.date).map(
      (t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        group: t.group,
        status: "open" as const,
      }),
    );
    return [...done, ...open];
  }, [closed, state.dayProvisions]);

  const historyEntries = useMemo(() => {
    if (!closed) return [];
    return thisDayInHistory(state.journals ?? [], closed.date);
  }, [closed, state.journals]);

  const workoutGaps = useMemo(() => {
    if (!closed) return workoutGapInsight([], today || "");
    return workoutGapInsight(state.workouts, closed.date);
  }, [closed, state.workouts, today]);

  const trends = useMemo(() => {
    if (!closed) {
      return sevenDayTrendInsight(state, today || "");
    }
    return sevenDayTrendInsight(state, closed.date);
  }, [closed, state, today]);

  const tomorrowDate = today ? addDays(today, 1) : "";

  async function submit() {
    if (!oneLine.trim() || !effectiveDate) return;
    if (mood == null || stress == null) {
      setError("Tap a number for mood and stress.");
      return;
    }
    setBusy(true);
    setError("");
    const snapshot: ClosedSnapshot = {
      date: effectiveDate,
      headline: oneLine.trim(),
      summary: standOut.trim(),
      mood,
      stress,
      photoDataUrl,
    };
    try {
      await post("/api/evening", {
        date: effectiveDate,
        mood,
        stress,
        oneLine: snapshot.headline,
        expandedJournal: snapshot.summary || undefined,
        photoDataUrl: photoDataUrl || undefined,
      });
      setClosed(snapshot);
      setResult(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (requestedAlreadyClosed && !result) {
    return (
      <main className="stack daily-briefing">
        <p className="eyebrow">Daily briefing</p>
        <h1>Already complete</h1>
        <p className="muted">
          {formatDisplayDate(requested)} already has a close.
        </p>
        {missing.length > 0 && (
          <SecondaryButton onClick={() => router.push("/journal")}>
            Pick a missed day
          </SecondaryButton>
        )}
        <PrimaryButton onClick={() => router.push("/")}>Home</PrimaryButton>
      </main>
    );
  }

  if (alreadyClosedToday && missing.length === 0 && !result) {
    return (
      <main className="stack daily-briefing">
        <p className="eyebrow">Daily briefing</p>
        <h1>Already complete</h1>
        <PrimaryButton onClick={() => router.push("/")}>Home</PrimaryButton>
      </main>
    );
  }

  if (result && closed) {
    return (
      <main className="stack success-pop daily-briefing evening-recap">
        <header className="daily-briefing-header">
          <p className="eyebrow">Daily briefing</p>
          <h1 className="daily-briefing-title">Close</h1>
        </header>
        {closed.date !== today && (
          <p className="muted">Backfilled {formatDisplayDate(closed.date)}</p>
        )}

        <p className="daily-briefing-remember-line">
          <strong>{closed.headline}</strong>
          {closed.summary ? (
            <span className="daily-briefing-remember-summary">
              {" "}
              — {closed.summary}
            </span>
          ) : null}
        </p>
        {closed.photoDataUrl ? (
          <div className="photo-subtle-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={closed.photoDataUrl} alt="Attached photo" />
          </div>
        ) : null}

        <WeatherExpanded
          mode="tomorrow"
          locationLabel={weatherLocation}
          days={weatherDays}
          focusDate={tomorrowDate}
          loading={weatherLoading}
        />

        <ThisDayInHistory today={closed.date} entries={historyEntries} />
        <WorldHeadlines headlines={news} loading={newsLoading} />
        <BriefingTasks
          tasks={briefingTasks}
          emptyLabel="No tasks logged for this day."
        />
        <BodyMind workouts={workoutGaps} trends={trends} />

        <PrimaryButton onClick={() => router.push("/journal")}>
          Open journal
        </PrimaryButton>

        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  if (!effectiveDate) {
    return (
      <main className="stack daily-briefing">
        <p className="eyebrow">Daily briefing</p>
        <h1>Nothing to close</h1>
        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  const isBackfill = effectiveDate !== today;
  const showDayPicker =
    missing.length > 1 || (alreadyClosedToday && missing.length > 0);
  const scalesReady = mood != null && stress != null;

  return (
    <main className="stack fade-in daily-briefing">
      <p className="eyebrow">{isBackfill ? "Catch up" : "Daily briefing"}</p>
      <h1>{isBackfill ? "Add a missed close" : "Close"}</h1>
      {isBackfill ? (
        <p className="muted">
          Closing {formatDisplayDate(effectiveDate)} — same mood, stress,
          headline, and summary as tonight.
        </p>
      ) : (
        <p className="muted">
          Check in first — then your evening briefing.
        </p>
      )}

      {showDayPicker && (
        <section className="panel">
          <label className="field">
            <span className="field-label">Which day?</span>
            <select
              value={effectiveDate}
              onChange={(e) => setCloseDate(e.target.value)}
            >
              {missing.map((d) => (
                <option key={d} value={d}>
                  {formatDisplayDate(d)}
                  {d === today ? " (today)" : ""}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">How did {isBackfill ? "that day" : "today"} go?</p>
        <TapScale label="Mood" value={mood} onChange={setMood} />
        <TapScale label="Stress" value={stress} onChange={setStress} />
      </section>

      <section className="panel">
        <p className="eyebrow">Journal page</p>
        <label className="field">
          <span className="field-label">Headline</span>
          <input
            type="text"
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value)}
            placeholder="One line for this day"
            maxLength={120}
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">
            Short summary
            <span className="tiny" style={{ marginLeft: 8, fontWeight: 400 }}>
              ~{SUMMARY_SENTENCE_SOFT_LIMIT} sentences
            </span>
          </span>
          <textarea
            rows={4}
            value={standOut}
            onChange={(e) => setStandOut(e.target.value)}
            placeholder="A few sentences — what you want to remember"
          />
          {standOut.trim() && (
            <span
              className="tiny"
              style={{
                marginTop: 6,
                color: summaryOver ? "var(--warn)" : undefined,
              }}
            >
              {summarySentences} / {SUMMARY_SENTENCE_SOFT_LIMIT} sentences
              {summaryOver ? " — trim a little if you can" : ""}
            </span>
          )}
        </label>
        <div style={{ marginTop: 14 }}>
          <span className="field-label">Photo · optional</span>
          <SubtlePhotoPicker
            preview={photoDataUrl}
            onPick={setPhotoDataUrl}
            onClear={() => setPhotoDataUrl(null)}
            cameraLabel="Take a photo"
            libraryLabel="Choose from Photos"
          />
        </div>
      </section>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <PrimaryButton
        onClick={submit}
        disabled={busy || !oneLine.trim() || !scalesReady}
      >
        {busy ? "Saving…" : isBackfill ? "Add journal entry" : "Close the day"}
      </PrimaryButton>
    </main>
  );
}

export default function EveningPage() {
  return (
    <Suspense
      fallback={
        <main className="stack">
          <p className="muted">Loading…</p>
        </main>
      }
    >
      <EveningPageInner />
    </Suspense>
  );
}
