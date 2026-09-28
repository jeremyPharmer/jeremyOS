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
  formatMoney,
  formatMoneyDown,
  leftoverBeforeApply,
  listSaveGoalSpendEntries,
  SAVE_GOAL_SPEND_CATEGORIES,
  saveGoalCloseForDate,
  saveGoalSpendCategoryLabel,
} from "@/lib/save-goals";
import type { SaveGoalSpendCategory } from "@/lib/types";
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
  const [applySaveGoals, setApplySaveGoals] = useState(true);
  const [drawFromGoalId, setDrawFromGoalId] = useState("");
  const [entryKind, setEntryKind] = useState<"add" | "spend" | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [spendCategory, setSpendCategory] =
    useState<SaveGoalSpendCategory | "">("");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  const [starPending, setStarPending] = useState(false);
  const [result, setResult] = useState(false);
  const [closed, setClosed] = useState<ClosedSnapshot | null>(null);
  const [error, setError] = useState("");
  /** After close (or reopen), check-in sits collapsed above the paper. */
  const [checkinOpen, setCheckinOpen] = useState(false);
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

  const closeDone = Boolean(editionClosed);
  const showCheckin = !closeDone || checkinOpen;
  const paperLive = closeDone && !checkinOpen;

  const closedStarred = Boolean(
    editionClosed && isStarredDay(state.starredDays, editionClosed.date),
  );

  const briefingDate = editionClosed?.date || effectiveDate || today || "";

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

  // Prefill scales when reopening an already-closed evening.
  useEffect(() => {
    if (!editionClosed || !checkinOpen) return;
    setMood(editionClosed.mood);
    setStress(editionClosed.stress);
    setOneLine(editionClosed.headline);
    setStandOut(editionClosed.summary);
  }, [editionClosed, checkinOpen]);

  // Pull news + tomorrow weather for the Close paper (compose wait + closed live).
  useEffect(() => {
    if (!briefingDate) return;
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
          fetch(`/api/news?date=${encodeURIComponent(briefingDate)}`),
          fetch(`/api/weather?${weatherQs.toString()}`),
          fetch(`/api/on-this-day?date=${encodeURIComponent(briefingDate)}`),
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
  }, [briefingDate]);

  const briefingTasks: BriefingTaskRow[] = useMemo(() => {
    if (!briefingDate) return [];
    const done = completedTodosForUndo(
      state.dayProvisions ?? [],
      briefingDate,
    ).map((t) => ({
      id: t.id,
      label: t.label,
      time: t.time,
      group: t.group,
      status: "done" as const,
    }));
    const open = openTodosOn(state.dayProvisions ?? [], briefingDate).map(
      (t) => ({
        id: t.id,
        label: t.label,
        time: t.time,
        group: t.group,
        status: "open" as const,
      }),
    );
    return [...done, ...open];
  }, [briefingDate, state.dayProvisions]);

  const historyEntries = useMemo(() => {
    if (!briefingDate) return [];
    return thisDayInHistory(state.journals ?? [], briefingDate);
  }, [briefingDate, state.journals]);

  const workoutGaps = useMemo(() => {
    if (!briefingDate) return workoutGapInsight([], today || "");
    return workoutGapInsight(state.workouts, briefingDate);
  }, [briefingDate, state.workouts, today]);

  const trends = useMemo(() => {
    if (!briefingDate) {
      return sevenDayTrendInsight(state, today || "");
    }
    return sevenDayTrendInsight(state, briefingDate);
  }, [briefingDate, state, today]);

  const moneyDate = effectiveDate || today || "";
  const saveGoals = useMemo(() => activeSaveGoals(state), [state]);
  const dayLedger = useMemo(
    () =>
      moneyDate
        ? leftoverBeforeApply(state, moneyDate)
        : { base: 0, carryIn: 0, inbound: 0, adds: 0, spend: 0, left: 0 },
    [state, moneyDate],
  );
  const dayTotalShown = dayLedger.inbound + dayLedger.adds;
  const daySpends = useMemo(
    () => (moneyDate ? listSaveGoalSpendEntries(state, moneyDate) : []),
    [state, moneyDate],
  );
  const dayApplied = useMemo(
    () => (moneyDate ? Boolean(saveGoalCloseForDate(state, moneyDate)) : false),
    [state, moneyDate],
  );
  const needsDrawPick = dayLedger.left < 0 && saveGoals.length > 1;
  const resolvedDrawFrom =
    drawFromGoalId ||
    (saveGoals.length === 1 ? saveGoals[0].id : undefined);
  const canApplyNegative = !needsDrawPick || Boolean(drawFromGoalId);

  const tomorrowDate = today ? addDays(today, 1) : "";

  const collapsedSummary = useMemo(() => {
    const src = editionClosed
      ? { mood: editionClosed.mood, stress: editionClosed.stress }
      : { mood, stress };
    if (src.mood == null || src.stress == null) return null;
    return `M ${src.mood} · St ${src.stress}`;
  }, [editionClosed, mood, stress]);

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

  async function submitEveningEntry() {
    const amount = Number(entryAmount);
    if (!entryKind || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (entryKind === "spend" && !spendCategory) {
      setError("Pick a category.");
      return;
    }
    setSaveBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "addSpend",
        date: moneyDate,
        amount,
        kind: entryKind,
        category: entryKind === "spend" ? spendCategory : undefined,
      });
      setEntryAmount("");
      setSpendCategory("");
      setEntryKind(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : entryKind === "add"
            ? "Could not add"
            : "Could not subtract",
      );
    } finally {
      setSaveBusy(false);
    }
  }

  async function removeEveningSpend(id: string) {
    setSaveBusy(true);
    setError("");
    try {
      await post("/api/save-goals", { action: "removeSpend", id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setSaveBusy(false);
    }
  }

  async function applyEveningTotals() {
    if (dayLedger.left < 0 && !resolvedDrawFrom) {
      setError("Pick a goal to take from.");
      return;
    }
    setSaveBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "applyTotals",
        date: moneyDate,
        drawFromGoalId: dayLedger.left < 0 ? resolvedDrawFrom : undefined,
      });
      setApplySaveGoals(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply");
    } finally {
      setSaveBusy(false);
    }
  }

  async function submit() {
    if (!oneLine.trim() || !effectiveDate) return;
    if (mood == null || stress == null) {
      setError("Tap a number for mood and stress.");
      return;
    }
    const shouldApply =
      saveGoals.length > 0 && applySaveGoals && !dayApplied;
    if (shouldApply && dayLedger.left < 0 && !resolvedDrawFrom) {
      setError("Pick a goal to take from.");
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
        applySaveGoals: shouldApply,
        drawFromGoalId:
          shouldApply && dayLedger.left < 0 ? resolvedDrawFrom : undefined,
      });
      setStarPending(false);
      setClosed(snapshot);
      setResult(true);
      setCheckinOpen(false);
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
      <main className="stack open-edition fade-in">
        <header className="open-edition-mast">
          <p className="open-edition-flag">Evening edition</p>
          <h1 className="open-edition-title">The Daily Close</h1>
          <div className="open-edition-rule" aria-hidden />
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

  if (!effectiveDate && !editionClosed) {
    return (
      <main className="stack open-edition fade-in">
        <header className="open-edition-mast">
          <p className="open-edition-flag">Evening edition</p>
          <h1 className="open-edition-title">The Daily Close</h1>
          <div className="open-edition-rule" aria-hidden />
        </header>
        <p className="muted">Nothing to close.</p>
        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  const isBackfill = Boolean(
    effectiveDate && today && effectiveDate !== today && !editionClosed,
  );
  const showDayPicker =
    !editionClosed &&
    (missing.length > 1 || (alreadyClosedToday && missing.length > 0));
  const scalesReady = mood != null && stress != null;
  const mastDate = formatHomeHeaderDate(
    editionClosed?.date || effectiveDate || today,
  );
  const morningLead =
    (editionClosed
      ? state.mornings
          .find((m) => m.date === editionClosed.date)
          ?.intention?.trim()
      : state.mornings.find((m) => m.date === effectiveDate)?.intention?.trim()) ||
    "";
  const rememberHeadline =
    editionClosed?.headline || oneLine.trim() || "";
  const rememberSummary =
    editionClosed?.summary || standOut.trim() || "";
  const rememberPhoto =
    editionClosed?.photoDataUrl || photoDataUrl || null;

  return (
    <main
      className={`stack open-edition${result ? " success-pop" : " fade-in"}`}
    >
      <header className="open-edition-mast">
        <p className="open-edition-flag">
          {isBackfill
            ? `Catch up · ${formatDisplayDate(effectiveDate)}`
            : `${mastDate} · Evening edition`}
        </p>
        <h1 className="open-edition-title">
          {isBackfill ? "Missed close" : "The Daily Close"}
        </h1>
        <div className="open-edition-rule" aria-hidden />
      </header>

      {showCheckin ? (
        <section
          className="open-edition-box"
          aria-label={closeDone ? "Evening check-in" : "Close check-in"}
        >
          <div className="open-edition-box-head">
            <p className="open-edition-kicker">Check in</p>
            <span className="open-edition-note">
              {closeDone
                ? "Closed"
                : isBackfill
                  ? "Same as tonight"
                  : "About a minute"}
            </span>
          </div>

          {showDayPicker ? (
            <label className="open-edition-lead-field">
              <span className="open-edition-kicker">Which day?</span>
              <select
                className="open-edition-select"
                value={effectiveDate}
                onChange={(e) => setCloseDate(e.target.value)}
                disabled={closeDone}
              >
                {missing.map((d) => (
                  <option key={d} value={d}>
                    {formatDisplayDate(d)}
                    {d === today ? " (today)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="open-edition-vitals">
            <TapScale
              label="Mood"
              value={mood}
              onChange={setMood}
              disabled={closeDone}
            />
            <TapScale
              label="Stress"
              value={stress}
              onChange={setStress}
              disabled={closeDone}
            />
          </div>

          <div className="open-edition-journal-block">
            <div className="open-edition-journal-head">
              <p className="open-edition-kicker">Journal</p>
              <button
                type="button"
                className="fy-star-btn"
                aria-label={
                  (closeDone ? closedStarred : composeStarred)
                    ? "Unstar day to remember"
                    : "Star as day to remember"
                }
                title={
                  (closeDone ? rememberHeadline : oneLine).trim()
                    ? closeDone
                      ? closedStarred
                        ? "Saved day"
                        : "Mark as a saved day"
                      : composeStarred
                        ? "Saved day"
                        : "Mark as a saved day"
                    : "Add a headline to star this day"
                }
                disabled={
                  busy ||
                  starBusy ||
                  !(closeDone ? rememberHeadline : oneLine).trim()
                }
                onClick={() => {
                  if (closeDone && editionClosed) {
                    void toggleStarNow(editionClosed.date);
                    return;
                  }
                  void onComposeStarClick();
                }}
              >
                <StarIcon
                  filled={closeDone ? closedStarred : composeStarred}
                />
              </button>
            </div>

            <label className="open-edition-lead-field">
              <span className="open-edition-kicker">Headline</span>
              <input
                type="text"
                value={closeDone ? rememberHeadline : oneLine}
                onChange={(e) => setOneLine(e.target.value)}
                placeholder="One line for this day"
                maxLength={120}
                disabled={closeDone}
              />
            </label>

            <label className="open-edition-lead-field">
              <span className="open-edition-kicker">
                Short summary
                <span className="open-edition-note" style={{ marginLeft: 8 }}>
                  ~{SUMMARY_SENTENCE_SOFT_LIMIT} sentences
                </span>
              </span>
              <textarea
                rows={4}
                value={closeDone ? rememberSummary : standOut}
                onChange={(e) => setStandOut(e.target.value)}
                placeholder="A few sentences — what you want to remember"
                disabled={closeDone}
              />
              {!closeDone && standOut.trim() ? (
                <span
                  className="tiny"
                  style={{
                    color: summaryOver ? "var(--warn)" : undefined,
                  }}
                >
                  {summarySentences} / {SUMMARY_SENTENCE_SOFT_LIMIT} sentences
                  {summaryOver ? " — trim a little if you can" : ""}
                </span>
              ) : null}
            </label>

            {!closeDone ? (
              <div className="open-edition-photo">
                <span className="open-edition-kicker">Photo · optional</span>
                <SubtlePhotoPicker
                  preview={photoDataUrl}
                  onPick={setPhotoDataUrl}
                  onClear={() => setPhotoDataUrl(null)}
                  cameraLabel="Take a photo"
                  libraryLabel="Choose from Photos"
                />
              </div>
            ) : rememberPhoto ? (
              <div className="photo-subtle-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rememberPhoto} alt="Attached photo" />
              </div>
            ) : null}
          </div>

          {!closeDone && saveGoals.length > 0 ? (
            <div className="open-edition-money" aria-label="Save ledger">
              <p className="open-edition-kicker">Save ledger</p>
              <div className="save-goal-glance-head" style={{ marginTop: 4 }}>
                <div>
                  <p className="open-edition-money-note" style={{ margin: 0 }}>
                    Day total {formatMoneyDown(dayTotalShown)}
                    {dayLedger.carryIn !== 0 ? (
                      <>
                        {" "}
                        · {dayLedger.carryIn > 0 ? "+" : ""}
                        {formatMoneyDown(dayLedger.carryIn)} rolled
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="save-goal-inbound-figure" aria-label="Left today">
                  {formatMoneyDown(dayLedger.left)}
                </p>
              </div>

              {entryKind ? (
                <div className="save-goal-create" style={{ marginTop: 10 }}>
                  <label className="open-edition-lead-field">
                    <span className="open-edition-kicker">
                      {entryKind === "add" ? "Add" : "Subtract"}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="0.01"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="8.18"
                      autoFocus
                    />
                  </label>
                  {entryKind === "spend" ? (
                    <div className="save-goal-spend-category">
                      <p className="open-edition-kicker" style={{ marginBottom: 6 }}>
                        Category
                      </p>
                      <div className="chip-row">
                        {SAVE_GOAL_SPEND_CATEGORIES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`chip${spendCategory === c.id ? " selected" : ""}`}
                            onClick={() => setSpendCategory(c.id)}
                            disabled={saveBusy}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="save-goal-create-actions">
                    <PrimaryButton
                      onClick={() => void submitEveningEntry()}
                      disabled={
                        saveBusy || (entryKind === "spend" && !spendCategory)
                      }
                    >
                      {saveBusy
                        ? "Saving…"
                        : entryKind === "add"
                          ? "Add"
                          : "Subtract"}
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={() => {
                        setEntryKind(null);
                        setSpendCategory("");
                        setError("");
                      }}
                      disabled={saveBusy}
                    >
                      Cancel
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <div
                  className="save-goal-glance-actions"
                  style={{ marginTop: 10 }}
                >
                  <SecondaryButton
                    onClick={() => {
                      setError("");
                      setEntryAmount("");
                      setSpendCategory("");
                      setEntryKind("add");
                    }}
                    disabled={saveBusy}
                  >
                    Add
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => {
                      setError("");
                      setEntryAmount("");
                      setSpendCategory("");
                      setEntryKind("spend");
                    }}
                    disabled={saveBusy}
                  >
                    Subtract
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={() => void applyEveningTotals()}
                    disabled={saveBusy || dayApplied || !canApplyNegative}
                  >
                    {saveBusy
                      ? "Saving…"
                      : dayApplied
                        ? "Applied"
                        : "Apply totals"}
                  </PrimaryButton>
                </div>
              )}

              {needsDrawPick && !dayApplied ? (
                <div className="save-goal-draw-from" style={{ marginTop: 12 }}>
                  <p className="open-edition-kicker" style={{ marginBottom: 6 }}>
                    Take from
                  </p>
                  <div className="chip-row">
                    {saveGoals.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`chip${drawFromGoalId === g.id ? " selected" : ""}`}
                        onClick={() => setDrawFromGoalId(g.id)}
                        disabled={saveBusy || busy}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="check-row" style={{ marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={dayApplied || applySaveGoals}
                  disabled={dayApplied}
                  onChange={(e) => setApplySaveGoals(e.target.checked)}
                />
                <span>
                  {dayApplied
                    ? "Leftover already applied to goals"
                    : "Apply leftover when I close the day"}
                </span>
              </label>
              <p className="open-edition-money-note" style={{ marginTop: 6 }}>
                Skip apply and leftover rolls into tomorrow.
              </p>

              {daySpends.length > 0 || dayApplied ? (
                <div className="save-goal-home-ledger" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="save-goal-log-toggle"
                    aria-expanded={ledgerOpen}
                    onClick={() => setLedgerOpen((v) => !v)}
                  >
                    <span aria-hidden="true">{ledgerOpen ? "▾" : "▸"}</span>
                    Ledger ({daySpends.length + (dayApplied ? 1 : 0)})
                  </button>
                  {ledgerOpen ? (
                    <div className="save-goal-ledger-rows home-ledger-body">
                      <div className="save-goal-ledger-row">
                        <span>Inbound</span>
                        <span>{formatMoney(dayLedger.inbound)}</span>
                      </div>
                      {daySpends.map((e) => {
                        const isAdd = e.kind === "add";
                        return (
                          <div
                            key={e.id}
                            className="save-goal-ledger-row spend"
                          >
                            <span>
                              {isAdd
                                ? "Add"
                                : saveGoalSpendCategoryLabel(e.category)}
                            </span>
                            <span className="save-goal-ledger-spend-val">
                              {isAdd ? "+" : "−"}
                              {formatMoney(e.amount)}
                              <button
                                type="button"
                                className="save-goal-add-link"
                                disabled={saveBusy}
                                onClick={() => void removeEveningSpend(e.id)}
                              >
                                Undo
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      <div className="save-goal-ledger-row leftover">
                        <span>Left</span>
                        <span>{formatMoney(dayLedger.left)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

          {closeDone ? (
            <PrimaryButton onClick={() => setCheckinOpen(false)}>
              Done
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={submit}
              disabled={
                busy ||
                !oneLine.trim() ||
                !scalesReady ||
                (applySaveGoals &&
                  !dayApplied &&
                  needsDrawPick &&
                  !drawFromGoalId)
              }
            >
              {busy ? "Saving…" : "Close the paper"}
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
            {rememberHeadline || "Today’s close"}
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
          paperLive ? " open-edition-paper-live" : " open-edition-paper-wait"
        }`}
      >
        {paperLive && morningLead ? (
          <section className="open-edition-story open-edition-story-lead">
            <p className="open-edition-kicker">Today&apos;s lead</p>
            <h2 className="open-edition-commit">{morningLead}</h2>
          </section>
        ) : null}

        {paperLive && rememberHeadline ? (
          <section
            className="open-edition-story"
            aria-label="Remember"
          >
            <div className="open-edition-sec-head">
              <p className="open-edition-kicker">Remember</p>
              <button
                type="button"
                className="fy-star-btn"
                aria-label={
                  closedStarred
                    ? "Unstar day to remember"
                    : "Star as day to remember"
                }
                disabled={starBusy || !editionClosed}
                onClick={() => {
                  if (editionClosed) void toggleStarNow(editionClosed.date);
                }}
              >
                <StarIcon filled={closedStarred} />
              </button>
            </div>
            <h2 className="open-edition-commit">{rememberHeadline}</h2>
            {rememberSummary ? (
              <p className="open-edition-deck">{rememberSummary}</p>
            ) : null}
            {rememberPhoto ? (
              <div className="photo-subtle-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rememberPhoto} alt="Attached photo" />
              </div>
            ) : null}
            {error && !showCheckin ? (
              <p style={{ color: "var(--danger)" }}>{error}</p>
            ) : null}
          </section>
        ) : null}

        <div className="open-edition-story open-edition-wx-wrap">
          <WeatherExpanded
            mode="tomorrow"
            locationLabel={weatherLocation}
            days={weatherDays}
            focusDate={tomorrowDate}
            loading={weatherLoading}
          />
        </div>

        {briefingTasks.length > 0 ? (
          <div className="open-edition-story open-edition-tasks-wrap">
            <BriefingTasks
              tasks={briefingTasks}
              kicker="Today’s tasks"
              linkHref="/items"
              linkLabel="Tasks →"
              emptyLabel="No tasks logged for this day."
              hideWhenEmpty
            />
          </div>
        ) : null}

        <div className="open-edition-story">
          <BodyMind workouts={workoutGaps} trends={trends} />
        </div>

        {newsLoading || news.length > 0 ? (
          <div className="open-edition-story">
            <WorldHeadlines
              headlines={news}
              loading={newsLoading}
              hideWhenEmpty
            />
          </div>
        ) : null}

        {briefingDate &&
        (historyEntries.length > 0 ||
          worldEvent ||
          worldLoading) ? (
          <div className="open-edition-story">
            <ThisDayInHistory
              today={briefingDate}
              entries={historyEntries}
              worldEvent={worldEvent}
              worldLoading={worldLoading}
              hideWhenEmpty
            />
          </div>
        ) : null}
      </div>

      {paperLive ? (
        <>
          <PrimaryButton onClick={() => router.push("/journal")}>
            Open journal
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push("/")}>
            Home
          </SecondaryButton>
        </>
      ) : null}
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
