/**
 * Client-safe agenda past helpers (no node:fs / node-ical).
 * Used by Home Calendar to strike and sink finished events.
 */

export type AgendaPastable = {
  allDay?: boolean;
  startTime: string;
  endTime?: string;
};

function formatLocalTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Parse agenda display times like "9:05 AM" / "12:00 PM" → minutes since midnight. */
export function parseAgendaDisplayTimeToMinutes(label: string): number | null {
  const t = label.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59 || hour < 1 || hour > 12) return null;
  const ap = m[3]!.toUpperCase();
  if (ap === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return hour * 60 + minute;
}

/** Current clock minutes in a timezone (from a Date). */
export function localMinutesInTz(now: Date, timezone: string): number {
  return parseAgendaDisplayTimeToMinutes(formatLocalTime(now, timezone)) ?? 0;
}

/**
 * Whether an agenda row is in the past for the viewed day.
 * Past calendar days → all past. Future days → none past.
 * Timed events on today → past after end (else start). All-day / Anytime stay current until the day rolls.
 */
export function isAgendaEventPast(
  event: AgendaPastable,
  viewDate: string,
  today: string,
  now: Date,
  timezone: string,
): boolean {
  if (viewDate < today) return true;
  if (viewDate > today) return false;
  if (
    event.allDay ||
    event.startTime === "All day" ||
    event.startTime === "Anytime"
  ) {
    return false;
  }
  const endLabel = event.endTime?.trim() || event.startTime;
  const endMins = parseAgendaDisplayTimeToMinutes(endLabel);
  if (endMins == null) return false;
  return localMinutesInTz(now, timezone) >= endMins;
}

/** Upcoming first (keep relative order), then past — one list, past sunk down. */
export function orderAgendaUpcomingThenPast<T extends AgendaPastable>(
  events: T[],
  viewDate: string,
  today: string,
  now: Date,
  timezone: string,
): T[] {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    if (isAgendaEventPast(event, viewDate, today, now, timezone)) {
      past.push(event);
    } else {
      upcoming.push(event);
    }
  }
  return [...upcoming, ...past];
}
