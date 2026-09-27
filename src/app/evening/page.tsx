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
import type { OnThisDayEvent } from "@/lib/on-this-day";
import {
  activeSaveGoals,
  dailyIncomeRate,
  formatMoney,
  inboundPercent,
  leftoverPool,
  mergeAllocations,
  normalizeSaveGoalSettings,
  splitPoolByWeight,
  splitPoolToOne,
} from "@/lib/save-goals";
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
  const [spendTotal, setSpendTotal] = useState("");
  const [lumpSum, setLumpSum] = useState("");
  const [lumpMode, setLumpMode] = useState<"preset" | "custom">("preset");
  const [lumpGoalId, setLumpGoalId] = useState("");
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
  const [worldEvent, setWorldEvent] = useState<OnThisDayEvent | null>(null);
  const [worldLoading, setWorldLoading] = useState(false);

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
    setWorldLoading(true);

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
        const [newsRes, weatherRes, onThisDayRes] = await Promise.all([
          fetch(`/api/news?date=${encodeURIComponent(editionClosed.date)}`),
          fetch(`/api/weather?${weatherQs.toString()}`),
          fetch(
            `/api/on-this-day?date=${encodeURIComponent(editionClosed.date)}`,
          ),
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
        if (onThisDayRes.ok) {
          const data = (await onThisDayRes.json()) as {
            event?: OnThisDayEvent | null;
          };
          setWorldEvent(data.event ?? null);
        }
      } catch {
        /* fail soft — briefing still works without news/weather */
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
          setWeatherLoading(false);
          setWorldLoading(false);
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

  const saveSettings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const moneyDate = effectiveDate || today || "";
  const dayRate = moneyDate
    ? dailyIncomeRate(moneyDate, saveSettings.monthlyIncome)
    : 0;
  const spendNum = spendTotal.trim() === "" ? null : Number(spendTotal);
  const lumpNum = lumpSum.trim() === "" ? 0 : Number(lumpSum);
  const moneyPreview = useMemo(() => {
    if (spendNum == null || !Number.isFinite(spendNum) || spendNum < 0) {
      return null;
    }
    const lump = Number.isFinite(lumpNum) && lumpNum >= 0 ? lumpNum : 0;
    const { leftover } = leftoverPool(dayRate, spendNum, 0);
    const goals = activeSaveGoals(state);
    const leftoverAlloc =
      goals.length && leftover !== 0 ? splitPoolByWeight(leftover, goals) : [];
    let lumpAlloc =
      goals.length && lump !== 0
        ? lumpMode === "custom" && lumpGoalId
          ? splitPoolToOne(lump, lumpGoalId)
          : splitPoolByWeight(lump, goals)
        : [];
    const allocations = mergeAllocations([...leftoverAlloc, ...lumpAlloc]);
    const pool = leftoverPool(dayRate, spendNum, lump).pool;
    return { leftover, lump, pool, leftoverAlloc, lumpAlloc, allocations, goals };
  }, [spendNum, lumpNum, dayRate, state, lumpMode, lumpGoalId]);
  const spendReady =
    spendTotal.trim() !== "" &&
    spendNum != null &&
    Number.isFinite(spendNum) &&
    spendNum >= 0;

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
    const spend = Number(spendTotal);
    if (spendTotal.trim() === "" || !Number.isFinite(spend) || spend < 0) {
      setError("Enter today’s total spend (0 or more).");
      return;
    }
    const lump = lumpSum.trim() === "" ? 0 : Number(lumpSum);
    if (!Number.isFinite(lump) || lump < 0) {
      setError("Lump sum must be 0 or more.");
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
        spendTotal: spend,
        lumpSum: lump,
        lumpMode: lump > 0 ? lumpMode : "preset",
        lumpGoalId:
          lump > 0 && lumpMode === "custom" && lumpGoalId
            ? lumpGoalId
            : undefined,
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
    const morningLead =
      state.mornings
        .find((m) => m.date === editionClosed.date)
        ?.intention?.trim() || "";
    return (
      <main
        className={`stack daily-briefing evening-recap paper-edition paper-rundown${
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
          {morningLead ? (
            <div className="paper-lead-story">
              <p className="paper-kicker">Today&apos;s lead</p>
              <h2 className="paper-front-headline">{morningLead}</h2>
            </div>
          ) : null}
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

        <div className="paper-pages paper-card-stack">
          <WeatherExpanded
            mode="tomorrow"
            locationLabel={weatherLocation}
            days={weatherDays}
            focusDate={tomorrowDate}
            loading={weatherLoading}
          />

          <BriefingTasks
            tasks={briefingTasks}
            emptyLabel="No tasks logged for this day."
            hideWhenEmpty
          />
          <BodyMind workouts={workoutGaps} trends={trends} />
          <WorldHeadlines
            headlines={news}
            loading={newsLoading}
            hideWhenEmpty
          />
          <ThisDayInHistory
            today={editionClosed.date}
            entries={historyEntries}
            worldEvent={worldEvent}
            worldLoading={worldLoading}
            hideWhenEmpty
          />
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

      <section className="panel" aria-label="Money today">
        <p className="eyebrow">Money today</p>
        <p className="tiny muted" style={{ marginTop: 0 }}>
          {formatMoney(saveSettings.monthlyIncome)} on the 1st ·{" "}
          {formatMoney(dayRate)} credited for this day
        </p>
        {activeSaveGoals(state).length > 0 ? (
          <div className="chip-row" style={{ marginTop: 10 }}>
            {activeSaveGoals(state).map((g) => {
              const pct = inboundPercent(g);
              return (
                <span
                  key={g.id}
                  className={`chip${pct >= 100 ? " selected" : ""}`}
                  title="Daily inbound preset"
                >
                  {g.name}
                  {pct > 0 ? ` · ${pct}%` : ""}
                </span>
              );
            })}
          </div>
        ) : null}
        <label className="field" style={{ marginTop: 10 }}>
          <span className="field-label">Total spend</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={spendTotal}
            onChange={(e) => setSpendTotal(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">
            Lump sum
            <span className="tiny" style={{ marginLeft: 8, fontWeight: 400 }}>
              optional one-time
            </span>
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={lumpSum}
            onChange={(e) => setLumpSum(e.target.value)}
            placeholder="Extra to put toward goals"
          />
        </label>
        {lumpNum > 0 && activeSaveGoals(state).length > 0 ? (
          <>
            <p className="field-label" style={{ marginTop: 12 }}>
              One-time goes to
            </p>
            <div className="chip-row">
              <button
                type="button"
                className={`chip${lumpMode === "preset" ? " selected" : ""}`}
                onClick={() => setLumpMode("preset")}
              >
                Daily chips
              </button>
              <button
                type="button"
                className={`chip${lumpMode === "custom" ? " selected" : ""}`}
                onClick={() => {
                  setLumpMode("custom");
                  const first = activeSaveGoals(state)[0];
                  if (!lumpGoalId && first) setLumpGoalId(first.id);
                }}
              >
                Custom (one area)
              </button>
            </div>
            {lumpMode === "custom" ? (
              <div className="chip-row" style={{ marginTop: 8 }}>
                {activeSaveGoals(state).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`chip${lumpGoalId === g.id ? " selected" : ""}`}
                    onClick={() => setLumpGoalId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        {moneyPreview ? (
          <div
            className={`evening-money-preview${
              moneyPreview.pool < 0 ? " negative" : ""
            }`}
          >
            {moneyPreview.leftover !== 0 ? (
              <p className="tiny">
                Daily {moneyPreview.leftover >= 0 ? "leftover" : "over"}{" "}
                {formatMoney(Math.abs(moneyPreview.leftover))}
                {moneyPreview.goals.length
                  ? " → daily inbound chips"
                  : ""}
              </p>
            ) : (
              <p className="tiny">Daily even — nothing from inbound</p>
            )}
            {moneyPreview.lump > 0 ? (
              <p className="tiny">
                One-time {formatMoney(moneyPreview.lump)}
                {lumpMode === "custom" && lumpGoalId
                  ? ` → ${
                      moneyPreview.goals.find((g) => g.id === lumpGoalId)
                        ?.name ?? "goal"
                    }`
                  : " → daily chips"}
              </p>
            ) : null}
            {moneyPreview.allocations.length > 0 ? (
              <ul className="tiny">
                {moneyPreview.allocations.map((a) => {
                  const g = moneyPreview.goals.find((x) => x.id === a.goalId);
                  if (!g) return null;
                  return (
                    <li key={a.goalId}>
                      {g.name}: {a.amount >= 0 ? "+" : ""}
                      {formatMoney(a.amount)}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <PrimaryButton
        onClick={submit}
        disabled={busy || !oneLine.trim() || !scalesReady || !spendReady}
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
