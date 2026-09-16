import ical, { type VEvent } from "node-ical";
import { addDays } from "./journey";
import {
  fetchGoogleCalendarEventsForDay,
  googleCalendarStatus,
} from "./google-calendar";
import type { TaskGroup } from "./task-groups";
import type { GoogleCalendarLink } from "./types";
import { normalizeIcalUrl } from "./ical-url";

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
  /** Which extra iCal feed (0-based) when source is extra */
  extraIndex?: number;
  /** Resolved life-area group for display (RB-026) */
  group?: TaskGroup;
};

export type CalendarFeedUrls = {
  personalIcalUrl?: string;
  workIcalUrl?: string;
  /** Additional iCal subscribe URLs from Settings */
  extraIcalUrls?: string[];
  googleCalendar?: GoogleCalendarLink;
};

const EXTRA_ICAL_MAX = 10;

export { normalizeIcalUrl } from "./ical-url";

/** Normalize + de-dupe extra iCal URLs (max 10). */
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
  extraIndex?: number,
): WorkCalendarEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  return eventsFromParsedIcs(parsed, date, timezone, source, extraIndex);
}

function eventsFromParsedIcs(
  parsed: ReturnType<typeof ical.sync.parseICS>,
  date: string,
  timezone: string,
  source: CalendarFeedSource,
  extraIndex?: number,
): WorkCalendarEvent[] {
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
        ...(source === "extra" && extraIndex !== undefined
          ? { extraIndex }
          : {}),
      });
    }
  }

  return out;
}

/** In-memory ICS cache — day taps / month prefetch reparse instead of re-downloading. */
const ICS_CACHE_TTL_MS = 5 * 60_000;
/** After a timeout/failure, skip re-hitting the same URL briefly (month prefetch). */
const ICS_FAIL_COOLDOWN_MS = 3 * 60_000;
const ICS_TIMEOUT_DEFAULT_MS = 15_000;
/** Apple shared/public links on *-caldav.icloud.com are often slow. */
const ICS_TIMEOUT_ICLOUD_MS = 22_000;
/** Extras must not block Home open — fail faster than primary Apple feeds. */
const ICS_TIMEOUT_EXTRA_MS = 10_000;
/** How long today's response waits for extras after primaries finish. */
const EXTRA_WAIT_BUDGET_MS = 3_000;

const icsTextCache = new Map<string, { text: string; at: number }>();
const icsParsedCache = new Map<
  string,
  { parsed: ReturnType<typeof ical.sync.parseICS>; at: number }
>();
const icsDayCache = new Map<string, { events: WorkCalendarEvent[]; at: number }>();
const icsFailCache = new Map<string, { error: Error; at: number }>();
const icsInflight = new Map<string, Promise<string>>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dayCacheKey(
  url: string,
  date: string,
  timezone: string,
  source: CalendarFeedSource,
  extraIndex?: number,
): string {
  return `${url}|${date}|${timezone}|${source}|${extraIndex ?? ""}`;
}

/** Reject HTML / CDN stub bodies that are not real calendars. */
export function assertIcsCalendar(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Calendar feed was empty");
  }
  // TeamSnap returns HTTP 200 with body `false` for bad/expired links
  if (/^(false|true|null)\s*$/i.test(trimmed)) {
    throw new Error("Calendar link looks invalid or expired");
  }
  if (!/BEGIN:VCALENDAR/i.test(trimmed)) {
    throw new Error("Feed did not return a calendar file");
  }
}

function feedErrorLabel(
  source: CalendarFeedSource,
  url: string,
  extraIndex?: number,
): string {
  let host: string = source;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep source */
  }
  if (source === "extra" && extraIndex !== undefined) {
    return `extra ${extraIndex + 1} (${host})`;
  }
  return `${source} (${host})`;
}

/** Timeout for an ICS URL; extras stay shorter so Home can paint sooner. */
export function icsTimeoutMsForUrl(
  url: string,
  source?: CalendarFeedSource,
): number {
  if (source === "extra") return ICS_TIMEOUT_EXTRA_MS;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      host.includes("icloud.com") ||
      host.includes("caldav") ||
      host.endsWith(".apple.com")
    ) {
      return ICS_TIMEOUT_ICLOUD_MS;
    }
  } catch {
    /* default */
  }
  return ICS_TIMEOUT_DEFAULT_MS;
}

/** Turn AbortTimeout noise into a short, user-facing line. */
export function humanizeFeedError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Feed error";
  if (/aborted due to timeout|TimeoutError|timed out/i.test(msg)) {
    return "timed out (will retry shortly)";
  }
  return msg;
}

async function fetchIcsText(
  url: string,
  source?: CalendarFeedSource,
): Promise<string> {
  const cached = icsTextCache.get(url);
  if (cached && Date.now() - cached.at < ICS_CACHE_TTL_MS) {
    return cached.text;
  }
  const failed = icsFailCache.get(url);
  if (failed && Date.now() - failed.at < ICS_FAIL_COOLDOWN_MS) {
    throw failed.error;
  }
  const existing = icsInflight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "text/calendar, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (compatible; Google-Calendar; JeremyOS/1.0)",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(icsTimeoutMsForUrl(url, source)),
      });
      if (!res.ok) {
        throw new Error(`Calendar feed failed (${res.status})`);
      }
      const text = await res.text();
      assertIcsCalendar(text);
      icsFailCache.delete(url);
      icsTextCache.set(url, { text, at: Date.now() });
      icsParsedCache.delete(url);
      return text;
    } catch (e) {
      const raw = e instanceof Error ? e : new Error("Feed error");
      const err = /aborted due to timeout|TimeoutError/i.test(raw.message)
        ? new Error("timed out")
        : raw;
      icsFailCache.set(url, { error: err, at: Date.now() });
      throw err;
    } finally {
      icsInflight.delete(url);
    }
  })();

  icsInflight.set(url, promise);
  return promise;
}

function parseIcsEventsForUrl(
  url: string,
  text: string,
  date: string,
  timezone: string,
  source: CalendarFeedSource,
  extraIndex?: number,
): WorkCalendarEvent[] {
  const key = dayCacheKey(url, date, timezone, source, extraIndex);
  const dayHit = icsDayCache.get(key);
  if (dayHit && Date.now() - dayHit.at < ICS_CACHE_TTL_MS) {
    return dayHit.events;
  }

  let parsedHit = icsParsedCache.get(url);
  if (!parsedHit || Date.now() - parsedHit.at >= ICS_CACHE_TTL_MS) {
    parsedHit = { parsed: ical.sync.parseICS(text), at: Date.now() };
    icsParsedCache.set(url, parsedHit);
  }

  const events = eventsFromParsedIcs(
    parsedHit.parsed,
    date,
    timezone,
    source,
    extraIndex,
  );
  icsDayCache.set(key, { events, at: Date.now() });
  return events;
}

async function loadIcsJob(job: {
  source: CalendarFeedSource;
  url: string;
  extraIndex?: number;
}, date: string, timezone: string): Promise<{
  events: WorkCalendarEvent[];
  error?: string;
}> {
  try {
    const text = await fetchIcsText(job.url, job.source);
    return {
      events: parseIcsEventsForUrl(
        job.url,
        text,
        date,
        timezone,
        job.source,
        job.extraIndex,
      ),
    };
  } catch (e) {
    return {
      events: [],
      error: `${feedErrorLabel(job.source, job.url, job.extraIndex)}: ${humanizeFeedError(e)}`,
    };
  }
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
 *
 * Primaries (personal / work / Google) block the response. Extras get a short
 * budget after primaries so a slow Apple share does not hold Home open.
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

  const jobs: {
    source: CalendarFeedSource;
    url: string;
    extraIndex?: number;
  }[] = [];
  if (resolved.personal) {
    jobs.push({ source: "personal", url: resolved.personal });
  }
  resolved.extras.forEach((url, extraIndex) => {
    jobs.push({ source: "extra", url, extraIndex });
  });

  const googleConnected = googleCalendarStatus(feeds.googleCalendar).connected;
  if (!googleConnected && resolved.work) {
    jobs.push({ source: "work", url: resolved.work });
  }

  if (jobs.length === 0 && !googleConnected) {
    return { events: [], connected: false, errors: [] };
  }

  const primaryJobs = jobs.filter((j) => j.source !== "extra");
  const extraJobs = jobs.filter((j) => j.source === "extra");

  const runGoogle = async () => {
    if (!googleConnected || !feeds.googleCalendar) return;
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
  };

  const mergeResults = (
    results: { events: WorkCalendarEvent[]; error?: string }[],
  ) => {
    for (const r of results) {
      collected.push(...r.events);
      if (r.error) errors.push(r.error);
    }
  };

  // Google + personal/work ICS — what Home should show first.
  const primaryResults = await Promise.all([
    runGoogle().then(() => null),
    ...primaryJobs.map((job) => loadIcsJob(job, date, timezone)),
  ]);
  mergeResults(
    primaryResults.filter(
      (r): r is { events: WorkCalendarEvent[]; error?: string } => r != null,
    ),
  );

  if (extraJobs.length > 0) {
    const extraResults = await Promise.all(
      extraJobs.map(async (job) => {
        const pending = loadIcsJob(job, date, timezone);
        const raced = await Promise.race([
          pending.then((r) => ({ kind: "done" as const, r })),
          delay(EXTRA_WAIT_BUDGET_MS).then(() => ({ kind: "budget" as const })),
        ]);
        if (raced.kind === "done") return raced.r;
        // Keep downloading so month markers / next tap hit cache.
        void pending;
        return null;
      }),
    );
    mergeResults(
      extraResults.filter(
        (r): r is { events: WorkCalendarEvent[]; error?: string } => r != null,
      ),
    );
  }

  return {
    events: sortAgenda(collected),
    connected: true,
    errors,
  };
}
