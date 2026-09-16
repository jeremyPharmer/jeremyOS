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
  formatHomeHeaderDate,
  isValidEveningDate,
  missingEveningDates,
  addDays,
} from "@/lib/journey";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  bundleJournalsByDate,
  countSentences,
  hasJournalContent,
  isStarredDay,
} from "@/lib/journal";
import type { NewsHeadline } from "@/lib/news";
import { completedTodosForUndo, openTodosOn } from "@/lib/todos";
import type { DailyForecast } from "@/lib/weather";

const COORDS_KEY = "rebuild-weather-coords";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <span aria-hidden className={filled ? "fy-star-on" : "fy-star-off"}>
      {filled ? "★" : "☆"}
    </span>
  );
}

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
  const { post, state, today } = useApp();
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
  const [starBusy, setStarBusy] = useState(false);
  const [starPending, setStarPending] = useState(false);
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

  const journalsByDate = useMemo(
    () => bundleJournalsByDate(state.journals),
    [state.journals],
  );
  const dayCanPersistStar =
    Boolean(effectiveDate) &&
    (state.evenings.some((e) => e.date === effectiveDate) ||
      hasJournalContent(journalsByDate, effectiveDate) ||
      isStarredDay(state.starredDays, effectiveDate));
  const persistedStarred = Boolean(
    effectiveDate && isStarredDay(state.starredDays, effectiveDate),
  );
  const composeStarred = dayCanPersistStar ? persistedStarred : starPending;

  const alreadyClosedToday =
    Boolean(today) && state.evenings.some((e) => e.date === today);
  const requestedAlreadyClosed =
    Boolean(requested) && state.evenings.some((e) => e.date === requested);

  /** Session snapshot, or reopen today's Close from persisted evening. */
  const editionClosed = useMemo((): ClosedSnapshot | null => {
    if (closed) return closed;
    if (!alreadyClosedToday || missing.length > 0) return null;
    if (!today) return null;
    const evening = state.evenings.find((e) => e.date === today);
    if (!evening) return null;
    return {
      date: evening.date,
      headline: evening.oneLine,
      summary: evening.expandedJournal?.trim() ?? "",
      mood: evening.mood,
      stress: evening.stress ?? 5,
      photoDataUrl: null,
    };
  }, [closed, alreadyClosedToday, missing.length, today, state.evenings]);

  const closedStarred = Boolean(
    editionClosed && isStarredDay(state.starredDays, editionClosed.date),
  );

  // Cancel pending star intent if the headline is cleared before close.
  useEffect(() => {
    if (!oneLine.trim() && starPending) {
      setStarPending(false);
    }
  }, [oneLine, starPending]);

  // Reset pending intent when switching which day we're closing.
  useEffect(() => {
    setStarPending(false);
  }, [effectiveDate]);

  // Prefill from a journal entry already written for this day (e.g. from /journal)
  // so Close the day does not force a blank overwrite.
  // Skip while showing success — refresh clears missing dates and would wipe
  // the local fields that used to drive the Remember headline (empty quotes).
  useEffect(() => {
    if (result || editionClosed) return;
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
  }, [effectiveDate, result, editionClosed]);

  // Pull news + tomorrow weather whenever the Close edition is on screen.
  useEffect(() => {
    if (!editionClosed || !today) return;
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
          fetch(`/api/news?date=${encodeURIComponent(editionClosed.date)}`),
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
  }, [editionClosed, today]);

  const briefingTasks: BriefingTaskRow[] = useMemo(() => {
    if (!editionClosed) return [];
    const done = completedTodosForUndo(
      state.dayProvisions ?? [],
      editionClosed.date,
    ).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      group: t.group,
      status: "done" as const,
    }));
    const open = openTodosOn(state.dayProvisions ?? [], editionClosed.date).map(
      (t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        group: t.group,
        status: "open" as const,
      }),
    );
    return [...done, ...open];
  }, [editionClosed, state.dayProvisions]);

  const historyEntries = useMemo(() => {
    if (!editionClosed) return [];
    return thisDayInHistory(state.journals ?? [], editionClosed.date);
  }, [editionClosed, state.journals]);

  const workoutGaps = useMemo(() => {
    if (!editionClosed) return workoutGapInsight([], today || "");
    return workoutGapInsight(state.workouts, editionClosed.date);
  }, [editionClosed, state.workouts, today]);

  const trends = useMemo(() => {
    if (!editionClosed) {
      return sevenDayTrendInsight(state, today || "");
    }
    return sevenDayTrendInsight(state, editionClosed.date);
  }, [editionClosed, state, today]);

  const tomorrowDate = today ? addDays(today, 1) : "";

  async function toggleStarNow(date: string) {
    setStarBusy(true);
    setError("");
    try {
      await post("/api/journal", { action: "toggleStar", date });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update star");
    } finally {
      setStarBusy(false);
    }
  }

  async function onComposeStarClick() {
    if (!effectiveDate || !oneLine.trim() || starBusy || busy) return;
    if (dayCanPersistStar) {
      await toggleStarNow(effectiveDate);
      return;
    }
    setStarPending((prev) => !prev);
  }

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
    const shouldStarAfterClose = starPending && !persistedStarred;
    try {
      await post("/api/evening", {
        date: effectiveDate,
        mood,
        stress,
        oneLine: snapshot.headline,
        expandedJournal: snapshot.summary || undefined,
        photoDataUrl: photoDataUrl || undefined,
      });
      setStarPending(false);
      setClosed(snapshot);
      setResult(true);
      if (shouldStarAfterClose) {
        try {
          await post("/api/journal", {
            action: "toggleStar",
            date: effectiveDate,
          });
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Day closed — star didn’t save; tap ★ to retry",
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (requestedAlreadyClosed && !result && requested !== today) {
    return (
      <main className="stack daily-briefing paper-edition">
        <header className="paper-masthead paper-masthead-compact">
          <p className="paper-masthead-flag">Evening edition</p>
          <h1 className="paper-masthead-title">The Daily Close</h1>
        </header>
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

  if (editionClosed) {
    const editionDate = formatHomeHeaderDate(editionClosed.date);
    return (
      <main
        className={`stack daily-briefing evening-recap paper-edition${
          result ? " success-pop" : " fade-in"
        }`}
      >
        <header className="paper-masthead">
          <p className="paper-masthead-flag">Evening edition</p>
          <h1 className="paper-masthead-title">The Daily Close</h1>
          <div className="paper-masthead-rule" aria-hidden />
          <p className="paper-masthead-dateline">
            <span>{editionDate}</span>
            <span className="paper-masthead-dot" aria-hidden>
              ·
            </span>
            <span>Day put to bed</span>
          </p>
        </header>
        {editionClosed.date !== today && (
          <p className="muted paper-checkin-note">
            Backfilled {formatDisplayDate(editionClosed.date)}
          </p>
        )}

        <section className="paper-front" aria-label="Remember">
          <div className="evening-remember-row">
            <div>
              <p className="paper-kicker">Remember</p>
              <h2 className="paper-headline">{editionClosed.headline}</h2>
              {editionClosed.summary ? (
                <p className="paper-deck">{editionClosed.summary}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="fy-star-btn"
              aria-label={
                closedStarred
                  ? "Unstar day to remember"
                  : "Star as day to remember"
              }
              disabled={starBusy}
              onClick={() => void toggleStarNow(editionClosed.date)}
            >
              <StarIcon filled={closedStarred} />
            </button>
          </div>
        </section>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {editionClosed.photoDataUrl ? (
          <div className="photo-subtle-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={editionClosed.photoDataUrl} alt="Attached photo" />
          </div>
        ) : null}

        <div className="paper-pages">
          <WeatherExpanded
            mode="tomorrow"
            locationLabel={weatherLocation}
            days={weatherDays}
            focusDate={tomorrowDate}
            loading={weatherLoading}
          />

          <ThisDayInHistory
            today={editionClosed.date}
            entries={historyEntries}
            hideWhenEmpty
          />
          <WorldHeadlines
            headlines={news}
            loading={newsLoading}
            hideWhenEmpty
          />
          <BriefingTasks
            tasks={briefingTasks}
            emptyLabel="No tasks logged for this day."
            hideWhenEmpty
          />
          <BodyMind workouts={workoutGaps} trends={trends} />
        </div>

        <PrimaryButton onClick={() => router.push("/journal")}>
          Open journal
        </PrimaryButton>

        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  if (!effectiveDate) {
    return (
      <main className="stack daily-briefing paper-edition">
        <header className="paper-masthead paper-masthead-compact">
          <p className="paper-masthead-flag">Evening edition</p>
          <h1 className="paper-masthead-title">The Daily Close</h1>
        </header>
        <p className="muted">Nothing to close.</p>
        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  const isBackfill = effectiveDate !== today;
  const showDayPicker =
    missing.length > 1 || (alreadyClosedToday && missing.length > 0);
  const scalesReady = mood != null && stress != null;

  return (
    <main className="stack fade-in daily-briefing paper-edition">
      <header className="paper-masthead paper-masthead-compact">
        <p className="paper-masthead-flag">
          {isBackfill ? "Catch up" : "Evening edition"}
        </p>
        <h1 className="paper-masthead-title">
          {isBackfill ? "Missed close" : "The Daily Close"}
        </h1>
        <div className="paper-masthead-rule" aria-hidden />
      </header>
      {isBackfill ? (
        <p className="muted paper-checkin-note">
          Closing {formatDisplayDate(effectiveDate)} — same mood, stress,
          headline, and summary as tonight.
        </p>
      ) : (
        <p className="muted paper-checkin-note">
          Check in first — then tonight&apos;s edition.
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
        <div className="evening-journal-head">
          <p className="eyebrow">Journal page</p>
          <button
            type="button"
            className="fy-star-btn"
            aria-label={
              composeStarred
                ? "Unstar day to remember"
                : "Star as day to remember"
            }
            title={
              oneLine.trim()
                ? composeStarred
                  ? "Saved day"
                  : "Mark as a saved day"
                : "Add a headline to star this day"
            }
            disabled={busy || starBusy || !oneLine.trim()}
            onClick={() => void onComposeStarClick()}
          >
            <StarIcon filled={composeStarred} />
          </button>
        </div>
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
