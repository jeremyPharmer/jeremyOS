"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { SubtlePhotoPicker } from "@/components/SubtlePhotoPicker";
import { PrimaryButton, ScaleInput, SecondaryButton } from "@/components/ui";
import {
  buildEveningRecap,
  type EveningRecapEvent,
  type EveningRecapTask,
} from "@/lib/evening-recap";
import {
  formatDisplayDate,
  isValidEveningDate,
  missingEveningDates,
} from "@/lib/journey";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  bundleJournalsByDate,
  countSentences,
} from "@/lib/journal";
import type { NewsHeadline } from "@/lib/news";
import { completedTodosForUndo, openTodosOn } from "@/lib/todos";
import type { WorkCalendarEvent } from "@/lib/work-calendar";

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
  const [mood, setMood] = useState(6);
  const [stress, setStress] = useState(5);
  const [oneLine, setOneLine] = useState("");
  const [standOut, setStandOut] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(false);
  const [closed, setClosed] = useState<ClosedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [recapEvents, setRecapEvents] = useState<EveningRecapEvent[]>([]);
  const [news, setNews] = useState<NewsHeadline[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

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

  // On success: pull calendar + world news for the Remember recap surface.
  useEffect(() => {
    if (!result || !closed) return;
    let cancelled = false;
    setNewsLoading(true);

    (async () => {
      try {
        const [calRes, newsRes] = await Promise.all([
          fetch(`/api/calendar/work?date=${encodeURIComponent(closed.date)}`),
          fetch("/api/news"),
        ]);
        if (cancelled) return;
        if (calRes.ok) {
          const data = (await calRes.json()) as {
            events?: WorkCalendarEvent[];
          };
          setRecapEvents(
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
        /* fail soft — recap still works without calendar/news */
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result, closed]);

  const alreadyClosedToday =
    Boolean(today) && state.evenings.some((e) => e.date === today);
  const requestedAlreadyClosed =
    Boolean(requested) && state.evenings.some((e) => e.date === requested);

  const recapTasks: EveningRecapTask[] = useMemo(() => {
    if (!closed) return [];
    const done = completedTodosForUndo(
      state.dayProvisions ?? [],
      closed.date,
    ).map((t) => ({
      id: t.id,
      label: t.label,
      done: true as const,
    }));
    const open = openTodosOn(state.dayProvisions ?? [], closed.date).map(
      (t) => ({
        id: t.id,
        label: t.label,
        done: false as const,
      }),
    );
    return [...done, ...open];
  }, [closed, state.dayProvisions]);

  const morningIntention = useMemo(() => {
    if (!closed) return undefined;
    return state.mornings.find((m) => m.date === closed.date)?.intention;
  }, [closed, state.mornings]);

  const recap = useMemo(() => {
    if (!closed) return null;
    return buildEveningRecap({
      scores: { mood: closed.mood, stress: closed.stress },
      intention: morningIntention,
      headline: closed.headline,
      summary: closed.summary || undefined,
      events: recapEvents,
      tasks: recapTasks,
    });
  }, [closed, morningIntention, recapEvents, recapTasks]);

  async function submit() {
    if (!oneLine.trim() || !effectiveDate) return;
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
      <main className="stack">
        <p className="eyebrow">Close the day</p>
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
      <main className="stack">
        <p className="eyebrow">Close the day</p>
        <h1>Already complete</h1>
        <PrimaryButton onClick={() => router.push("/")}>Home</PrimaryButton>
      </main>
    );
  }

  if (result && closed) {
    return (
      <main className="stack success-pop evening-recap">
        <p className="eyebrow">Remember</p>
        <h1>Day closed.</h1>
        {closed.date !== today && (
          <p className="muted">Backfilled {formatDisplayDate(closed.date)}</p>
        )}

        {recap ? (
          <section className="evening-recap-board" aria-live="polite">
            <p className="evening-recap-summary">{recap.summary}</p>
            {recap.sections.map((section) => (
              <article key={section.key} className="evening-recap-block">
                <h2 className="evening-recap-label">{section.label}</h2>
                {section.body ? (
                  <p className="evening-recap-copy">{section.body}</p>
                ) : null}
                {section.items && section.items.length > 0 ? (
                  <ul className="evening-recap-list">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {section.key === "journal" && closed.photoDataUrl ? (
                  <div className="photo-subtle-preview" style={{ marginTop: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={closed.photoDataUrl} alt="Attached photo" />
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        <section className="panel evening-news" aria-live="polite">
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            In the world
          </p>
          {newsLoading && news.length === 0 ? (
            <p className="muted tiny">Gathering headlines…</p>
          ) : news.length === 0 ? (
            <p className="muted tiny">
              News feed unavailable right now — try again later.
            </p>
          ) : (
            <ul className="evening-news-list">
              {news.map((h) => (
                <li key={`${h.source}-${h.title}`}>
                  {h.url ? (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evening-news-link"
                    >
                      {h.title}
                    </a>
                  ) : (
                    <span className="evening-news-title">{h.title}</span>
                  )}
                  <span className="evening-news-source">{h.source}</span>
                </li>
              ))}
            </ul>
          )}
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
      <main className="stack">
        <p className="eyebrow">Close the day</p>
        <h1>Nothing to close</h1>
        <SecondaryButton onClick={() => router.push("/")}>Home</SecondaryButton>
      </main>
    );
  }

  const isBackfill = effectiveDate !== today;
  const showDayPicker =
    missing.length > 1 || (alreadyClosedToday && missing.length > 0);

  return (
    <main className="stack fade-in">
      <p className="eyebrow">{isBackfill ? "Catch up" : "Confirm + reflect"}</p>
      <h1>{isBackfill ? "Add a missed close" : "Close the day"}</h1>
      {isBackfill && (
        <p className="muted">
          Closing {formatDisplayDate(effectiveDate)} — same mood, stress,
          headline, and summary as tonight.
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
        <ScaleInput label="Mood" value={mood} onChange={setMood} />
        <ScaleInput label="Stress" value={stress} onChange={setStress} />
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
        disabled={busy || !oneLine.trim()}
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
