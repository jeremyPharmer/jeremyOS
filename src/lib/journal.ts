import type { JournalEntry, RebuildState } from "./types";
import { addDays, formatDate, getEvening, newId, parseDate, todayInTz } from "./journey";
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
 * Persist-dismiss a past missed evening day from catch-up (RB-039).
 * Does not create an evening close or touch reclaim / milestones.
 * Today and future dates are rejected.
 */
export function ignoreMissedEveningDate(
  state: RebuildState,
  date: string,
  asOfDate?: string,
): RebuildState {
  if (!state.profile) {
    throw Object.assign(new Error("Not onboarded"), { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw Object.assign(new Error("Date must be YYYY-MM-DD"), { status: 400 });
  }
  const asOf = asOfDate ?? todayInTz(state.profile.timezone);
  if (date >= asOf) {
    throw Object.assign(new Error("Cannot ignore today or a future day"), {
      status: 400,
    });
  }
  const start = state.profile.currentRunStartedOn;
  if (date < start) {
    throw Object.assign(new Error("Date is outside the current run"), {
      status: 400,
    });
  }
  if (getEvening(state, date)) {
    throw Object.assign(new Error("Day is already closed"), { status: 400 });
  }
  const ignored = normalizeStarredDays(state.ignoredEveningDates);
  if (ignored.includes(date)) return state;
  return {
    ...state,
    ignoredEveningDates: normalizeStarredDays([...ignored, date]),
  };
}

/**
 * Create or update journal prose for a day.
 * Syncs evenings when a check-in exists; otherwise journals only (manual backfill).
 * Never touches reclaim/milestones.
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

  let journals = [...state.journals];
  const oneLineIdx = journals.findIndex(
    (j) => j.date === date && j.type === "one_line",
  );
  const journalIdx = journals.findIndex(
    (j) => j.date === date && j.type === "journal",
  );

  const existingPhoto = journals.find(
    (j) => j.date === date && j.photoId,
  )?.photoId;
  const resolvedPhoto =
    photoId !== undefined ? photoId || undefined : existingPhoto;

  if (oneLineIdx >= 0) {
    journals[oneLineIdx] = {
      ...journals[oneLineIdx],
      text: headline,
      ...(photoId !== undefined ? { photoId: resolvedPhoto } : {}),
    };
  } else {
    journals.push({
      id: newId("journal"),
      date,
      type: "one_line",
      text: headline,
      photoId: resolvedPhoto,
      createdAt: new Date().toISOString(),
    });
  }

  if (summary) {
    if (journalIdx >= 0) {
      journals[journalIdx] = {
        ...journals[journalIdx],
        text: summary,
        ...(photoId !== undefined ? { photoId: resolvedPhoto } : {}),
      };
    } else {
      journals.push({
        id: newId("journal"),
        date,
        type: "journal",
        text: summary,
        photoId: resolvedPhoto,
        createdAt: new Date().toISOString(),
      });
    }
  } else if (journalIdx >= 0) {
    journals = journals.filter((_, i) => i !== journalIdx);
  }

  if (photoId !== undefined) {
    journals = journals.map((j) =>
      j.date === date ? { ...j, photoId: resolvedPhoto } : j,
    );
  }

  return { ...state, evenings, journals };
}
