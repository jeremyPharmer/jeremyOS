"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import {
  JournalMonthCalendar,
  type JournalDayMark,
} from "@/components/journal/JournalMonthCalendar";
import { SubtlePhotoPicker } from "@/components/SubtlePhotoPicker";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  bundleJournalsByDate,
  countSentences,
  fiveYearSlots,
  formatMonthDayLong,
  formatWeekdayAbbrev,
  isStarredDay,
  monthDayKey,
  shiftMonthDay,
  type DayKey,
} from "@/lib/journal";
import {
  formatDisplayDate,
  missingEveningDates,
} from "@/lib/journey";
import { monthKey as toMonthKey } from "@/lib/workouts";

function photoSrc(photoId: string): string {
  return `/api/photos/${encodeURIComponent(photoId)}`;
}

function PaperclipIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <span aria-hidden className={filled ? "fy-star-on" : "fy-star-off"}>
      {filled ? "★" : "☆"}
    </span>
  );
}

type Panel = "day" | "month" | "stars" | "photos";

type DayListRow = {
  date: string;
  headline?: string;
  summary?: string;
  photoId?: string;
};

function JournalDayList({
  emptyMessage,
  rows,
  metaIcon,
  onSelect,
}: {
  emptyMessage: string;
  rows: DayListRow[];
  metaIcon: "star" | "photo";
  onSelect: (date: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="muted fy-starred-empty">{emptyMessage}</p>;
  }
  return (
    <ul>
      {rows.map((row) => (
        <li key={row.date}>
          <button
            type="button"
            className="fy-starred-row"
            onClick={() => onSelect(row.date)}
          >
            <span className="fy-starred-meta">
              {metaIcon === "star" ? (
                <StarIcon filled />
              ) : (
                <PaperclipIcon />
              )}
              <span>{formatDisplayDate(row.date)}</span>
            </span>
            <span className="fy-starred-headline">
              {row.headline || "Untitled"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function JournalNav({
  panel,
  onSelect,
}: {
  panel: Panel;
  onSelect: (next: Panel) => void;
}) {
  function toggle(next: Panel) {
    onSelect(panel === next ? "day" : next);
  }

  return (
    <nav className="fy-journal-foot" aria-label="Journal views">
      <button
        type="button"
        className={`fy-tool-btn${panel === "month" ? " is-active" : ""}`}
        onClick={() => toggle("month")}
      >
        Month
      </button>
      <button
        type="button"
        className={`fy-tool-btn${panel === "stars" ? " is-active" : ""}`}
        onClick={() => toggle("stars")}
      >
        Remembered
      </button>
      <button
        type="button"
        className={`fy-tool-btn${panel === "photos" ? " is-active" : ""}`}
        onClick={() => toggle("photos")}
      >
        With photos
      </button>
    </nav>
  );
}

export default function JournalPage() {
  const { state, today, post } = useApp();
  const anchorYear = today
    ? Number(today.slice(0, 4))
    : new Date().getFullYear();
  const [dayKey, setDayKey] = useState<DayKey | null>(null);
  const [panel, setPanel] = useState<Panel>("day");
  const [calMonth, setCalMonth] = useState(() =>
    today ? today.slice(0, 7) : toMonthKey(anchorYear, 1),
  );
  const [viewPhotoId, setViewPhotoId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editHeadline, setEditHeadline] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [missedNotice, setMissedNotice] = useState<string | null>(null);

  const activeDay: DayKey =
    dayKey ?? (today ? monthDayKey(today) : "01-01");

  const byDate = useMemo(
    () => bundleJournalsByDate(state.journals),
    [state.journals],
  );

  const slots = useMemo(
    () => fiveYearSlots(activeDay, byDate, anchorYear, 4),
    [activeDay, byDate, anchorYear],
  );

  const missed = useMemo(() => {
    if (!today) return [];
    return missingEveningDates(state, today).filter((d) => d < today);
  }, [state, today]);

  const missedSet = useMemo(() => {
    const s = new Set(missed);
    if (today && !state.evenings.some((e) => e.date === today)) {
      s.add(today);
    }
    return s;
  }, [missed, today, state.evenings]);

  const closedSet = useMemo(
    () => new Set(state.evenings.map((e) => e.date)),
    [state.evenings],
  );

  const starredSet = useMemo(
    () => new Set(state.starredDays ?? []),
    [state.starredDays],
  );

  const dayMarks = useMemo(() => {
    const map = new Map<string, JournalDayMark>();
    const { year, month } = (() => {
      const [y, m] = calMonth.split("-").map(Number);
      return { year: y, month: m };
    })();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${calMonth}-${String(d).padStart(2, "0")}`;
      if (closedSet.has(date) || byDate.has(date)) {
        map.set(date, "closed");
      } else if (missedSet.has(date)) {
        map.set(date, "missing");
      } else {
        map.set(date, "empty");
      }
    }
    return map;
  }, [calMonth, closedSet, byDate, missedSet]);

  const starredList = useMemo((): DayListRow[] => {
    return [...(state.starredDays ?? [])]
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const bundle = byDate.get(date);
        return {
          date,
          headline: bundle?.headline,
          summary: bundle?.summary,
          photoId: bundle?.photoId,
        };
      });
  }, [state.starredDays, byDate]);

  const photosList = useMemo((): DayListRow[] => {
    const dates = new Set<string>();
    for (const j of state.journals) {
      if (j.photoId) dates.add(j.date);
    }
    return [...dates]
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const bundle = byDate.get(date);
        return {
          date,
          headline: bundle?.headline,
          summary: bundle?.summary,
          photoId: bundle?.photoId,
        };
      });
  }, [state.journals, byDate]);

  const todaySlot = today ? slots.find((s) => s.date === today) : undefined;
  const canWriteToday =
    Boolean(today) &&
    monthDayKey(today!) === activeDay &&
    !state.evenings.some((e) => e.date === today);

  const summarySentences = countSentences(editSummary);
  const summaryOver =
    editSummary.trim().length > 0 &&
    summarySentences > SUMMARY_SENTENCE_SOFT_LIMIT;

  function go(delta: number) {
    setDayKey(shiftMonthDay(activeDay, delta, anchorYear));
    setMissedNotice(null);
    setEditingDate(null);
  }

  function openDayFromList(date: string) {
    setDayKey(monthDayKey(date));
    setPanel("day");
    setEditingDate(null);
    if (missedSet.has(date) && !closedSet.has(date)) {
      setMissedNotice(date);
    } else {
      setMissedNotice(null);
    }
  }

  function selectPanel(next: Panel) {
    setPanel(next);
    if (next === "month" && today) {
      setCalMonth(today.slice(0, 7));
    }
  }

  function startEdit(date: string) {
    const bundle = byDate.get(date);
    const evening = state.evenings.find((e) => e.date === date);
    setEditingDate(date);
    setEditHeadline(bundle?.headline ?? evening?.oneLine ?? "");
    setEditSummary(
      bundle?.summary ?? evening?.expandedJournal ?? "",
    );
    setEditPhoto(null);
    setError("");
    setMissedNotice(null);
  }

  async function saveEdit() {
    if (!editingDate) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/journal", {
        action: "updateEntry",
        date: editingDate,
        oneLine: editHeadline,
        expandedJournal: editSummary,
        photoDataUrl: editPhoto || undefined,
      });
      setEditingDate(null);
      setEditPhoto(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar(date: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/journal", { action: "toggleStar", date });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update star");
    } finally {
      setBusy(false);
    }
  }

  async function ignoreMissedDay(date: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/journal", { action: "ignoreMissed", date });
      if (missedNotice === date) setMissedNotice(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not ignore day");
    } finally {
      setBusy(false);
    }
  }

  const viewSrc = viewPhotoId ? photoSrc(viewPhotoId) : undefined;

  const panelTitle =
    panel === "month"
      ? "Browse days"
      : panel === "stars"
        ? "Days to remember"
        : panel === "photos"
          ? "With photos"
          : null;

  const panelSubtitle =
    panel === "month"
      ? "Tap a day to open its page."
      : panel === "stars"
        ? "Your starred journal days."
        : panel === "photos"
          ? "Days with an attached photo."
          : null;

  return (
    <main className="fy-journal fade-in">
      <header className="fy-journal-head">
        {panel === "day" ? (
          <>
            <div className="fy-journal-nav">
              <button
                type="button"
                className="fy-journal-nav-btn"
                onClick={() => go(-1)}
                aria-label="Previous day"
              >
                ‹
              </button>
              <h1 className="fy-journal-title">
                {formatMonthDayLong(activeDay)}
              </h1>
              <button
                type="button"
                className="fy-journal-nav-btn"
                onClick={() => go(1)}
                aria-label="Next day"
              >
                ›
              </button>
            </div>
            <p className="fy-journal-sub muted">
              Same day across four years — headline and a short note.
            </p>
          </>
        ) : (
          <>
            <h1 className="fy-journal-title">{panelTitle}</h1>
            {panelSubtitle && (
              <p className="fy-journal-sub muted">{panelSubtitle}</p>
            )}
          </>
        )}
      </header>

      {panel === "month" && today && (
        <JournalMonthCalendar
          monthKey={calMonth}
          today={today}
          dayMarks={dayMarks}
          starredDays={starredSet}
          selectedDate={
            dayKey
              ? `${calMonth.slice(0, 4)}-${dayKey}`
              : today
          }
          onMonthChange={setCalMonth}
          onSelectDate={openDayFromList}
        />
      )}

      {panel === "stars" && (
        <section className="fy-starred-list">
          <JournalDayList
            emptyMessage="Star a written day to keep it here."
            rows={starredList}
            metaIcon="star"
            onSelect={openDayFromList}
          />
        </section>
      )}

      {panel === "photos" && (
        <section className="fy-starred-list">
          <JournalDayList
            emptyMessage="Attach a photo on a journal day to see it here."
            rows={photosList}
            metaIcon="photo"
            onSelect={openDayFromList}
          />
        </section>
      )}

      {panel === "day" && (
        <>
          {missedNotice && (
            <p className="fy-missed-notice">
              {formatDisplayDate(missedNotice)} isn’t closed yet.{" "}
              <Link href={`/evening?date=${missedNotice}`}>
                Close that day →
              </Link>
              {today && missedNotice < today && (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="fy-ignore-btn"
                    disabled={busy}
                    onClick={() => void ignoreMissedDay(missedNotice)}
                  >
                    Ignore
                  </button>
                </>
              )}
            </p>
          )}

          <article className="fy-page" key={activeDay}>
            <div className="fy-page-rule" aria-hidden />
            {slots.map((slot, i) => {
              const empty = !slot.headline && !slot.summary;
              const isToday = today === slot.date;
              const hasEvening = closedSet.has(slot.date);
              const hasContent = !empty;
              const starred = isStarredDay(state.starredDays, slot.date);
              const isEditing = editingDate === slot.date;
              const isMissed =
                !hasEvening &&
                missedSet.has(slot.date) &&
                empty;

              return (
                <section
                  key={slot.year}
                  className={`fy-year${empty ? " is-empty" : ""}${isToday ? " is-today" : ""}${starred ? " is-starred" : ""}`}
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="fy-year-gutter">
                    <span className="fy-year-num">{slot.year}</span>
                    <span className="fy-year-dow">{formatWeekdayAbbrev(slot.date)}</span>
                    {slot.photoId && (
                      <button
                        type="button"
                        className="fy-photo-clip"
                        aria-label="View attached photo"
                        title="Has photo"
                        onClick={() => setViewPhotoId(slot.photoId!)}
                      >
                        <PaperclipIcon />
                      </button>
                    )}
                    {hasContent && (
                      <button
                        type="button"
                        className="fy-star-btn"
                        aria-label={
                          starred
                            ? "Unstar day to remember"
                            : "Star as day to remember"
                        }
                        disabled={busy}
                        onClick={() => void toggleStar(slot.date)}
                      >
                        <StarIcon filled={starred} />
                      </button>
                    )}
                  </div>
                  <div className="fy-year-body">
                    {isEditing ? (
                      <div className="fy-edit">
                        <label className="field">
                          <span className="field-label">Headline</span>
                          <input
                            type="text"
                            value={editHeadline}
                            onChange={(e) => setEditHeadline(e.target.value)}
                            maxLength={120}
                          />
                        </label>
                        <label className="field" style={{ marginTop: 10 }}>
                          <span className="field-label">Short summary</span>
                          <textarea
                            rows={4}
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                          />
                          <span
                            className="tiny"
                            style={{
                              marginTop: 6,
                              color: summaryOver ? "var(--warn)" : undefined,
                            }}
                          >
                            {summarySentences} / {SUMMARY_SENTENCE_SOFT_LIMIT}{" "}
                            sentences
                            {summaryOver ? " — trim a little if you can" : ""}
                          </span>
                        </label>
                        <div style={{ marginTop: 12 }}>
                          <span className="field-label">Photo · optional</span>
                          {slot.photoId && !editPhoto && (
                            <p className="muted" style={{ margin: "4px 0 8px" }}>
                              Already has a photo — pick a new one to replace.
                            </p>
                          )}
                          <SubtlePhotoPicker
                            preview={editPhoto}
                            onPick={setEditPhoto}
                            onClear={() => setEditPhoto(null)}
                            cameraLabel="Take a photo"
                            libraryLabel="Choose from Photos"
                          />
                        </div>
                        <div className="fy-edit-actions">
                          <PrimaryButton
                            disabled={busy || !editHeadline.trim()}
                            onClick={() => void saveEdit()}
                          >
                            Save
                          </PrimaryButton>
                          <SecondaryButton
                            disabled={busy}
                            onClick={() => {
                              setEditingDate(null);
                              setEditPhoto(null);
                            }}
                          >
                            Cancel
                          </SecondaryButton>
                        </div>
                      </div>
                    ) : empty ? (
                      <div>
                        <p className="fy-blank">
                          {isToday && canWriteToday
                            ? "Waiting for today’s page…"
                            : "—"}
                        </p>
                        <button
                          type="button"
                          className="fy-edit-link"
                          onClick={() => startEdit(slot.date)}
                        >
                          Add entry
                        </button>
                        {isMissed && (
                          <p className="fy-missed-inline">
                            <Link href={`/evening?date=${slot.date}`}>
                              Close this day →
                            </Link>
                            {today && slot.date < today && (
                              <>
                                {" · "}
                                <button
                                  type="button"
                                  className="fy-ignore-btn"
                                  disabled={busy}
                                  onClick={() => void ignoreMissedDay(slot.date)}
                                >
                                  Ignore
                                </button>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {slot.headline && (
                          <h2 className="fy-headline">{slot.headline}</h2>
                        )}
                        {slot.summary && (
                          <p className="fy-summary">{slot.summary}</p>
                        )}
                        <button
                          type="button"
                          className="fy-edit-link"
                          onClick={() => startEdit(slot.date)}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </article>

          {canWriteToday && todaySlot && (
            <p className="fy-write">
              <Link href="/evening" className="fy-write-link">
                Write today’s headline →
              </Link>
            </p>
          )}

          {missed.length > 0 && (
            <p className="fy-catchup muted">
              <Link
                href={`/evening?date=${missed[0]}`}
                className="fy-catchup-link"
              >
                {missed.length === 1
                  ? "One day still open to catch up →"
                  : `${missed.length} days still open to catch up →`}
              </Link>
            </p>
          )}
        </>
      )}

      <JournalNav panel={panel} onSelect={selectPanel} />

      {error && (
        <p style={{ color: "var(--danger)", textAlign: "center" }}>{error}</p>
      )}

      {viewSrc && (
        <div
          className="fy-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Journal photo"
          onClick={() => setViewPhotoId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setViewPhotoId(null);
          }}
        >
          <button
            type="button"
            className="fy-photo-lightbox-close"
            aria-label="Close photo"
            onClick={() => setViewPhotoId(null)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewSrc}
            alt="Journal photo"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
