import type { JournalEntry, RebuildState } from "./types";
import { addDays, formatDate, getEvening, newId, parseDate } from "./journey";
import { normalizeStarredDays } from "./fund";

export type DayKey = `${string}-${string}`; // MM-DD

export type FiveYearEntry = {
  date: string;
  year: number;
  headline?: string;
  summary?: string;
  photoId?: string;
};

export type DayBundle = {
  date: string;
  headline?: string;
  summary?: string;
  photoId?: string;
};

/** Calendar month-day key from YYYY-MM-DD */
export function monthDayKey(isoDate: string): DayKey {
  return isoDate.slice(5) as DayKey;
}

/** Pretty month + day for a YYYY-MM-DD or MM-DD */
export function formatMonthDayLong(isoOrMd: string): string {
  const iso = isoOrMd.length === 5 ? `2000-${isoOrMd}` : isoOrMd;
  return parseDate(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/** Three-letter weekday for YYYY-MM-DD (e.g. Mon, Tue). */
export function formatWeekdayAbbrev(isoDate: string): string {
  return parseDate(isoDate).toLocaleDateString("en-US", { weekday: "short" });
}

/** Soft sentence count for journal summaries (approx). */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

export const SUMMARY_SENTENCE_SOFT_LIMIT = 5;

/** Group journal rows by full date → headline (one_line) + summary (journal). */
export function bundleJournalsByDate(
  journals: JournalEntry[],
): Map<string, DayBundle> {
  const byDate = new Map<string, DayBundle>();
  for (const j of journals) {
    const row = byDate.get(j.date) ?? { date: j.date };
    if (j.type === "one_line") {
      row.headline = j.text;
    } else if (j.type === "journal") {
      row.summary = j.text;
    }
    if (j.photoId && !row.photoId) {
      row.photoId = j.photoId;
    }
    byDate.set(j.date, row);
  }
  return byDate;
}

/**
 * Year slots for a month-day, anchored on `anchorYear` and going backward.
 * Always returns `years` slots (empty when no entry).
 */
export function fiveYearSlots(
  mmDd: DayKey,
  byDate: Map<string, DayBundle>,
  anchorYear: number,
  years = 4,
): FiveYearEntry[] {
  const slots: FiveYearEntry[] = [];
  for (let i = 0; i < years; i++) {
    const year = anchorYear - i;
    const date = dateForYear(mmDd, year);
    const bundled = byDate.get(date);
    slots.push({
      date,
      year,
      headline: bundled?.headline,
      summary: bundled?.summary,
      photoId: bundled?.photoId,
    });
  }
  return slots;
}

/** Whether a calendar day has journal prose (headline or summary). */
export function hasJournalContent(
  byDate: Map<string, DayBundle>,
  date: string,
): boolean {
  const row = byDate.get(date);
  return Boolean(row?.headline?.trim() || row?.summary?.trim());
}

/** Shift a month-day by n calendar days within a reference year. */
export function shiftMonthDay(
  mmDd: DayKey,
  deltaDays: number,
  refYear: number,
): DayKey {
  const iso = `${refYear}-${mmDd}`;
  return monthDayKey(addDays(iso, deltaDays));
}

/** Today's month-day in a timezone-local today string. */
export function todayMonthDay(today: string): DayKey {
  return monthDayKey(today);
}

export function isLeapDay(mmDd: DayKey): boolean {
  return mmDd === "02-29";
}

/**
 * Build a concrete YYYY-MM-DD for a month-day in `year`.
 * Feb 29 in non-leap years → Feb 28.
 */
export function dateForYear(mmDd: DayKey, year: number): string {
  if (mmDd === "02-29") {
    const probe = parseDate(`${year}-02-29`);
    if (formatDate(probe) !== `${year}-02-29`) {
      return `${year}-02-28`;
    }
  }
  return `${year}-${mmDd}`;
}

/** Toggle a YYYY-MM-DD in the starred bookmark list (no cap). */
export function toggleStarredDay(
  starredDays: string[] | undefined,
  date: string,
): string[] {
  const current = normalizeStarredDays(starredDays);
  if (current.includes(date)) {
    return current.filter((d) => d !== date);
  }
  return normalizeStarredDays([...current, date]);
}

export function isStarredDay(
  starredDays: string[] | undefined,
  date: string,
): boolean {
  return normalizeStarredDays(starredDays).includes(date);
}



/**
 * Keep at most one `one_line` and one `journal` row per date.
 * Prefer the last row of each type (matches bundle display).
 */
export function dedupeJournalRows(journals: JournalEntry[]): JournalEntry[] {
  const lastOneLine = new Map<string, JournalEntry>();
  const lastJournal = new Map<string, JournalEntry>();
  const other: JournalEntry[] = [];

  for (const j of journals) {
    if (j.type === "one_line") {
      lastOneLine.set(j.date, j);
    } else if (j.type === "journal") {
      lastJournal.set(j.date, j);
    } else {
      other.push(j);
    }
  }

  const dates = new Set([...lastOneLine.keys(), ...lastJournal.keys()]);
  const collapsed: JournalEntry[] = [];
  for (const date of dates) {
    const one = lastOneLine.get(date);
    const summary = lastJournal.get(date);
    if (one) collapsed.push(one);
    if (summary) collapsed.push(summary);
  }
  return [...other, ...collapsed];
}

/**
 * Create or update journal prose for a day.
 * Syncs evenings when a check-in exists; otherwise journals only (manual backfill).
 * Never touches reclaim/milestones.
 *
 * Collapses duplicate one_line/journal rows for the date so display (last-wins
 * in the bundle) and edit stay in sync — leftover duplicates made saves look
 * like they "didn't stick."
 */
export function applyJournalProseEdit(
  state: RebuildState,
  date: string,
  oneLine: string,
  expandedJournal?: string,
  photoId?: string,
): RebuildState {
  const headline = oneLine.trim();
  if (!headline) {
    throw Object.assign(new Error("Headline is required"), { status: 400 });
  }
  const summary = expandedJournal?.trim() || undefined;

  const evening = getEvening(state, date);
  const evenings = evening
    ? state.evenings.map((e) =>
        e.date === date
          ? { ...e, oneLine: headline, expandedJournal: summary }
          : e,
      )
    : state.evenings;

  const existingPhoto = state.journals.find(
    (j) => j.date === date && j.photoId,
  )?.photoId;
  const resolvedPhoto =
    photoId !== undefined ? photoId || undefined : existingPhoto;

  // Drop prior prose rows for this date, then write a single clean pair.
  const journals = state.journals.filter(
    (j) =>
      !(j.date === date && (j.type === "one_line" || j.type === "journal")),
  );

  journals.push({
    id: newId("journal"),
    date,
    type: "one_line",
    text: headline,
    photoId: resolvedPhoto,
    createdAt: new Date().toISOString(),
  });

  if (summary) {
    journals.push({
      id: newId("journal"),
      date,
      type: "journal",
      text: summary,
      photoId: resolvedPhoto,
      createdAt: new Date().toISOString(),
    });
  }

  return { ...state, evenings, journals };
}
