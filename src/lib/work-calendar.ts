import ical, { type VEvent } from "node-ical";
import { addDays } from "./journey";
import {
  fetchGoogleCalendarEventsForDay,
  googleCalendarStatus,
} from "./google-calendar";
import type { GoogleCalendarLink } from "./types";

export type CalendarFeedSource = "personal" | "work" | "extra" | "custom";

export type WorkCalendarEvent = {
  id: string;
  title: string;
  /** Local time label, e.g. "9:00 AM"; "All day" for date-only */
  startTime: string;
  endTime?: string;
  location?: string;
  /** Video call or calendar deep link when available */
  url?: string;
  allDay?: boolean;
  source: CalendarFeedSource;
};

export type CalendarFeedUrls = {
  personalIcalUrl?: string;
  workIcalUrl?: string;
  /** Additional iCal subscribe URLs from Settings */
  extraIcalUrls?: string[];
  googleCalendar?: GoogleCalendarLink;
};

const EXTRA_ICAL_MAX = 5;

/** Normalize + de-dupe extra iCal URLs (max 5). */
export function normalizeExtraIcalUrls(
  raw: unknown,
): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const url = normalizeIcalUrl(String(item ?? ""));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= EXTRA_ICAL_MAX) break;
  }
  return out.length > 0 ? out : undefined;
}

const ICS_URL_MAX = 2000;

/** Normalize pasted calendar links (webcal → https). */
export function normalizeIcalUrl(
  raw: string | undefined | null,
): string | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  const swapped = trimmed.replace(/^webcal:/i, "https:");
  try {
    const u = new URL(swapped);
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    return u.toString().slice(0, ICS_URL_MAX);
  } catch {
    return undefined;
  }
}

export function ymdInTz(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatLocalTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function eventUrl(ev: VEvent): string | undefined {
  const href = ev.url;
  if (!href) return undefined;
  if (typeof href === "string") return href;
  if (typeof href === "object" && href && "val" in href) {
    return String((href as { val: string }).val);
  }
  return undefined;
}

function parameterText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "val" in value) {
    return String((value as { val: string }).val);
  }
  return String(value);
}

function floatingDateYmd(d: Date): string {
  // ICS VALUE=DATE is a floating calendar day (stored as UTC midnight).
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eventOverlapsLocalDay(
  start: Date,
  end: Date | undefined,
  allDay: boolean,
  date: string,
  timezone: string,
): boolean {
  if (allDay) {
    const startYmd =
      (start as Date & { dateOnly?: boolean }).dateOnly
        ? floatingDateYmd(start)
        : ymdInTz(start, timezone);
    if (!end) return startYmd === date;
    const endYmd =
      (end as Date & { dateOnly?: boolean }).dateOnly
        ? floatingDateYmd(end)
        : ymdInTz(end, timezone);
    // ICS all-day DTEND is exclusive
    return startYmd <= date && date < endYmd;
  }

  const startYmd = ymdInTz(start, timezone);
  if (!end) return startYmd === date;
  const endYmd = ymdInTz(end, timezone);
  if (startYmd === date || endYmd === date) return true;
  return startYmd < date && endYmd > date;
}

export function sortAgenda(events: WorkCalendarEvent[]): WorkCalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    if (!a.allDay && !b.allDay) {
      const ap = Date.parse(`1970-01-01 ${a.startTime}`);
      const bp = Date.parse(`1970-01-01 ${b.startTime}`);
      if (!Number.isNaN(ap) && !Number.isNaN(bp) && ap !== bp) return ap - bp;
    }
    return a.title.localeCompare(b.title);
  });
}

/**
 * Parse ICS text into agenda events for one local calendar day.
 */
export function parseIcsEventsForDay(
  icsText: string,
  date: string,
  timezone: string,
  source: CalendarFeedSource,
): WorkCalendarEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const from = new Date(`${addDays(date, -1)}T00:00:00Z`);
  const to = new Date(`${addDays(date, 2)}T00:00:00Z`);
  const out: WorkCalendarEvent[] = [];

  for (const value of Object.values(parsed)) {
    if (!value || typeof value !== "object") continue;
    if ((value as { type?: string }).type !== "VEVENT") continue;
    const ev = value as VEvent;
    if (!ev.start) continue;
    if (String(ev.status || "").toUpperCase() === "CANCELLED") continue;

    let instances: ReturnType<typeof ical.expandRecurringEvent>;
    try {
      instances = ical.expandRecurringEvent(ev, {
        from,
        to,
        includeOverrides: true,
        excludeExdates: true,
        expandOngoing: true,
      });
    } catch {
      instances = [
        {
          start: ev.start,
          end: (ev.end as Date) ?? ev.start,
          summary: ev.summary,
          isFullDay: Boolean(
            (ev.start as Date & { dateOnly?: boolean }).dateOnly,
          ),
          isRecurring: false,
          isOverride: false,
          event: ev,
        },
      ];
    }

    for (const inst of instances) {
      const start = inst.start;
      const end = inst.end;
      if (!(start instanceof Date)) continue;
      const allDay = Boolean(
        inst.isFullDay ||
          (start as Date & { dateOnly?: boolean }).dateOnly,
      );
      if (!eventOverlapsLocalDay(start, end, allDay, date, timezone)) {
        continue;
      }

      const uid = String(ev.uid || parameterText(ev.summary) || "event");
      out.push({
        id: `${source}:${uid}:${start.toISOString()}`,
        title: parameterText(inst.summary || ev.summary).trim() || "Untitled",
        startTime: allDay ? "All day" : formatLocalTime(start, timezone),
        endTime:
          !allDay && end instanceof Date
            ? formatLocalTime(end, timezone)
            : undefined,
        location: parameterText(ev.location).trim() || undefined,
        url: eventUrl(inst.event ?? ev),
        allDay,
        source,
      });
    }
  }

  return out;
}

/** Short in-memory ICS cache — day taps reparse instead of re-downloading. */
const ICS_CACHE_TTL_MS = 90_000;
const icsTextCache = new Map<string, { text: string; at: number }>();

async function fetchIcsText(url: string): Promise<string> {
  const cached = icsTextCache.get(url);
  if (cached && Date.now() - cached.at < ICS_CACHE_TTL_MS) {
    return cached.text;
  }
  const res = await fetch(url, {
    headers: {
      Accept: "text/calendar, text/plain, */*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Calendar feed failed (${res.status})`);
  }
  const text = await res.text();
  icsTextCache.set(url, { text, at: Date.now() });
  return text;
}

/**
 * Resolve feed URLs: profile Settings first, then eng env fallback for work.
 * Product path is Settings paste (Apple + Google secret ICS links).
 */
export function resolveCalendarFeedUrls(
  feeds: CalendarFeedUrls,
  envWorkUrl = process.env.WORK_CALENDAR_ICS_URL,
): { personal?: string; work?: string; extras: string[] } {
  const personal = normalizeIcalUrl(feeds.personalIcalUrl);
  const work =
    normalizeIcalUrl(feeds.workIcalUrl) || normalizeIcalUrl(envWorkUrl);
  const used = new Set(
    [personal, work].filter((u): u is string => Boolean(u)),
  );
  const extras = (normalizeExtraIcalUrls(feeds.extraIcalUrls) ?? []).filter(
    (url) => !used.has(url),
  );
  return { personal, work, extras };
}

/**
 * Personal iCal + work Google Calendar events for a day (combined agenda).
 * RB-023 — read-only ICS; Settings URLs preferred (≠ todos).
 */
export async function fetchWorkCalendarEvents(
  date: string,
  timezone: string,
  feeds: CalendarFeedUrls = {},
): Promise<{
  events: WorkCalendarEvent[];
  connected: boolean;
  errors: string[];
}> {
  const resolved = resolveCalendarFeedUrls(feeds);
  const errors: string[] = [];
  const collected: WorkCalendarEvent[] = [];

  const jobs: { source: CalendarFeedSource; url: string }[] = [];
  if (resolved.personal) {
    jobs.push({ source: "personal", url: resolved.personal });
  }
  for (const url of resolved.extras) {
    jobs.push({ source: "extra", url });
  }

  const googleConnected = googleCalendarStatus(feeds.googleCalendar).connected;
  if (googleConnected && feeds.googleCalendar) {
    try {
      collected.push(
        ...(await fetchGoogleCalendarEventsForDay(
          feeds.googleCalendar,
          date,
          timezone,
        )),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google Calendar error";
      errors.push(`google: ${msg}`);
    }
  } else if (resolved.work) {
    jobs.push({ source: "work", url: resolved.work });
  }

  if (jobs.length === 0 && !googleConnected) {
    return { events: [], connected: false, errors: [] };
  }

  await Promise.all(
    jobs.map(async ({ source, url }) => {
      try {
        const text = await fetchIcsText(url);
        collected.push(...parseIcsEventsForDay(text, date, timezone, source));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Feed error";
        errors.push(`${source}: ${msg}`);
      }
    }),
  );

  return {
    events: sortAgenda(collected),
    connected: true,
    errors,
  };
}
