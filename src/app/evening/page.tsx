"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { SubtlePhotoPicker } from "@/components/SubtlePhotoPicker";
import { PrimaryButton, SecondaryButton, TapScale } from "@/components/ui";
import {
  formatDisplayDate,
  formatHomeHeaderDate,
  isValidEveningDate,
  missingEveningDates,
} from "@/lib/journey";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  bundleJournalsByDate,
  countSentences,
  hasJournalContent,
  isStarredDay,
} from "@/lib/journal";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <span aria-hidden className={filled ? "fy-star-on" : "fy-star-off"}>
      {filled ? "★" : "☆"}
    </span>
  );
}

type ClosedSnapshot = {
  date: string;
  headline: string;
  summary: string;
  dayRating: number;
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
  const [dayRating, setDayRating] = useState<number | null>(null);
  const [oneLine, setOneLine] = useState("");
  const [standOut, setStandOut] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  const [starPending, setStarPending] = useState(false);
  const [result, setResult] = useState(false);
  const [closed, setClosed] = useState<ClosedSnapshot | null>(null);
  const [error, setError] = useState("");

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

  const editionClosed = useMemo((): ClosedSnapshot | null => {
    if (closed) return closed;
    if (!alreadyClosedToday || missing.length > 0) return null;
    if (!today) return null;
    const evening = state.evenings.find((e) => e.date === today);
    if (!evening) return null;
    const rating = evening.dayRating ?? evening.mood;
    return {
      date: evening.date,
      headline: evening.oneLine,
      summary: evening.expandedJournal?.trim() ?? "",
      dayRating: rating,
      photoDataUrl: null,
    };
  }, [closed, alreadyClosedToday, missing.length, today, state.evenings]);

  const closedStarred = Boolean(
    editionClosed && isStarredDay(state.starredDays, editionClosed.date),
  );

  useEffect(() => {
    if (!oneLine.trim() && starPending) setStarPending(false);
  }, [oneLine, starPending]);

  useEffect(() => {
    setStarPending(false);
  }, [effectiveDate]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [effectiveDate, result, editionClosed]);

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
    if (dayRating == null) {
      setError("Rate the day from 1 to 5.");
      return;
    }
    setBusy(true);
    setError("");
    const snapshot: ClosedSnapshot = {
      date: effectiveDate,
      headline: oneLine.trim(),
      summary: standOut.trim(),
      dayRating,
      photoDataUrl,
    };
    const shouldStarAfterClose = starPending && !persistedStarred;
    try {
      await post("/api/evening", {
        date: effectiveDate,
        dayRating,
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

  if (editionClosed) {
    const editionDate = formatHomeHeaderDate(editionClosed.date);
    return (
      <main
        className={`stack open-edition${result ? " success-pop" : " fade-in"}`}
      >
        <header className="open-edition-mast">
          <p className="open-edition-flag">
            {editionDate} · Evening edition
          </p>
          <h1 className="open-edition-title">The Daily Close</h1>
          <div className="open-edition-rule" aria-hidden />
        </header>

        <section className="open-edition-box" aria-label="Remember">
          <div className="open-edition-journal-head">
            <p className="open-edition-kicker">Remember</p>
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
          <h2 className="open-edition-commit">{editionClosed.headline}</h2>
          {editionClosed.summary ? (
            <p className="open-edition-deck">{editionClosed.summary}</p>
          ) : null}
          <p className="open-edition-note" style={{ marginTop: 8 }}>
            Day rating {editionClosed.dayRating} / 5
          </p>
          {editionClosed.photoDataUrl ? (
            <div className="photo-subtle-preview" style={{ marginTop: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editionClosed.photoDataUrl} alt="Attached photo" />
            </div>
          ) : null}
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        </section>

        <PrimaryButton onClick={() => router.push("/journal")}>
          Open journal
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  if (!effectiveDate) {
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

  const isBackfill = Boolean(effectiveDate && today && effectiveDate !== today);
  const showDayPicker =
    missing.length > 1 || (alreadyClosedToday && missing.length > 0);
  const mastDate = formatHomeHeaderDate(effectiveDate);

  return (
    <main className="stack fade-in open-edition">
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

      <section className="open-edition-box" aria-label="Close check-in">
        <div className="open-edition-box-head">
          <p className="open-edition-kicker">Check in</p>
          <span className="open-edition-note">
            {isBackfill ? "Same as tonight" : "About a minute"}
          </span>
        </div>

        {showDayPicker ? (
          <label className="open-edition-lead-field">
            <span className="open-edition-kicker">Which day?</span>
            <select
              className="open-edition-select"
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
        ) : null}

        <div className="open-edition-vitals">
          <TapScale
            label="Rate the day"
            value={dayRating}
            onChange={setDayRating}
            min={1}
            max={5}
          />
        </div>

        <div className="open-edition-journal-block">
          <div className="open-edition-journal-head">
            <p className="open-edition-kicker">Journal</p>
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

          <label className="open-edition-lead-field">
            <span className="open-edition-kicker">Headline</span>
            <input
              type="text"
              value={oneLine}
              onChange={(e) => setOneLine(e.target.value)}
              placeholder="One line for this day"
              maxLength={120}
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
              value={standOut}
              onChange={(e) => setStandOut(e.target.value)}
              placeholder="A few sentences — what you want to remember"
            />
            {standOut.trim() ? (
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
        </div>

        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

        <PrimaryButton
          onClick={submit}
          disabled={busy || !oneLine.trim() || dayRating == null}
        >
          {busy ? "Saving…" : "Close the paper"}
        </PrimaryButton>
      </section>
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
