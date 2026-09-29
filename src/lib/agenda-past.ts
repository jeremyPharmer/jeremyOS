/**
 * Client-safe agenda past helpers (no node:fs / node-ical).
 * Used by Home Calendar to hide finished events on today (in-progress stays).
 */

export type AgendaPastable = {
  allDay?: boolean;
  startTime: string;
  endTime?: string;
};

/** Calendar date YYYY-MM-DD in a timezone (client-safe). */
export function calendarDateInTz(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatLocalTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Parse agenda display times like "9:05 AM" / "12:00 PM" / "21:05" → minutes. */
export function parseAgendaDisplayTimeToMinutes(label: string): number | null {
  const t = label.trim().replace(/[\u202f\u00a0]/g, " ");
  if (!t) return null;

  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hour = Number(m12[1]);
    const minute = Number(m12[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (minute < 0 || minute > 59 || hour < 1 || hour > 12) return null;
    const ap = m12[3]!.toUpperCase();
    if (ap === "AM") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  // 24h (device hourCycle can make Intl omit AM/PM even for en-US)
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour = Number(m24[1]);
    const minute = Number(m24[2]);
    if (
      Number.isFinite(hour) &&
      Number.isFinite(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return hour * 60 + minute;
    }
  }

  return null;
}

/** Current clock minutes in a timezone (from a Date). */
export function localMinutesInTz(now: Date, timezone: string): number {
  // Prefer parts API so 24h device settings cannot zero-out "past" checks.
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);
    if (
      Number.isFinite(hour) &&
      Number.isFinite(minute) &&
      hour >= 0 &&
      hour <= 23
    ) {
      return hour * 60 + minute;
    }
  } catch {
    /* fall through */
  }
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
  const effectiveToday = today || calendarDateInTz(now, timezone);
  if (viewDate < effectiveToday) return true;
  if (viewDate > effectiveToday) return false;
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

/**
 * Drop finished timed events when viewing today.
 * In-progress (started, not yet ended) and all-day stay. Other days unchanged.
 */
export function filterAgendaActiveEvents<T extends AgendaPastable>(
  events: T[],
  viewDate: string,
  today: string,
  now: Date,
  timezone: string,
): T[] {
  const effectiveToday = today || calendarDateInTz(now, timezone);
  if (viewDate !== effectiveToday) return events;
  return events.filter(
    (event) => !isAgendaEventPast(event, viewDate, effectiveToday, now, timezone),
  );
}
