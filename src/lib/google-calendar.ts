import { SignJWT, jwtVerify } from "jose";
import { addDays } from "./journey";
import type { GoogleCalendarLink } from "./types";
import type { WorkCalendarEvent } from "./work-calendar";
import { eventOverlapsLocalDay, formatLocalTime } from "./work-calendar";

export type GoogleCalendarStatus = {
  connected: boolean;
  connectedAt?: string;
  accountEmail?: string;
  calendarId?: string;
};

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email";

const OAUTH_STATE_TTL_SECONDS = 600;

type GoogleCalendarLinkInput = {
  connectedAt: string;
  accountEmail?: string;
  calendarId: string;
  refreshToken: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
};

type GoogleCalendarEventItem = {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

type GoogleEventsListResponse = {
  items?: GoogleCalendarEventItem[];
  error?: { message?: string };
};

function authSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "jeremyos-dev-auth-secret-change-me";
  return new TextEncoder().encode(raw);
}

export function appBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    return "https://jeremyos-prod.fly.dev";
  }
  return "http://localhost:3000";
}

export function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim(),
  );
}

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/calendar/google/callback`;
}

export function googleCalendarStatus(
  link?: GoogleCalendarLinkInput | null,
): GoogleCalendarStatus {
  if (!link?.refreshToken) return { connected: false };
  return {
    connected: true,
    connectedAt: link.connectedAt,
    accountEmail: link.accountEmail,
    calendarId: link.calendarId || "primary",
  };
}

/** Remove OAuth secrets before sending profile/state to the browser. */
export function sanitizeGoogleCalendarLink(
  link?: GoogleCalendarLinkInput | null,
): GoogleCalendarStatus | undefined {
  const status = googleCalendarStatus(link);
  return status.connected ? status : undefined;
}

export async function signGoogleOAuthState(userId: string): Promise<string> {
  return new SignJWT({ kind: "google_calendar_oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(authSecret());
}

export async function verifyGoogleOAuthState(
  state: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, authSecret());
    if (payload.kind !== "google_calendar_oauth") return null;
    const sub = String(payload.sub || "");
    return sub || null;
  } catch {
    return null;
  }
}

export function googleAuthorizeUrl(state: string): string {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("Google Calendar OAuth is not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Token exchange failed");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

const googleAccessTokenCache = new Map<
  string,
  { token: string; expiresAtMs: number }
>();

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<string> {
  const cached = googleAccessTokenCache.get(refreshToken);
  if (cached && Date.now() < cached.expiresAtMs - 60_000) {
    return cached.token;
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.access_token) {
    googleAccessTokenCache.delete(refreshToken);
    throw new Error(data.error_description || data.error || "Token refresh failed");
  }

  const expiresInSec = Math.max(60, Number(data.expires_in) || 3600);
  googleAccessTokenCache.set(refreshToken, {
    token: data.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  });
  return data.access_token;
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | undefined> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as GoogleUserInfo;
  return data.email?.trim() || undefined;
}

function parseGoogleInstant(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseGoogleAllDayDate(date?: string): Date | undefined {
  if (!date) return undefined;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  (dt as Date & { dateOnly?: boolean }).dateOnly = true;
  return dt;
}

export function mapGoogleEventsForDay(
  items: GoogleCalendarEventItem[],
  date: string,
  timezone: string,
): WorkCalendarEvent[] {
  const out: WorkCalendarEvent[] = [];

  for (const item of items) {
    if (!item.id) continue;
    if (String(item.status || "").toLowerCase() === "cancelled") continue;

    const allDay = Boolean(item.start?.date && !item.start?.dateTime);
    const start = allDay
      ? parseGoogleAllDayDate(item.start?.date)
      : parseGoogleInstant(item.start?.dateTime);
    if (!start) continue;

    const end = allDay
      ? parseGoogleAllDayDate(item.end?.date)
      : parseGoogleInstant(item.end?.dateTime);

    if (!eventOverlapsLocalDay(start, end, allDay, date, timezone)) continue;

    out.push({
      id: `google:${item.id}:${start.toISOString()}`,
      title: String(item.summary || "").trim() || "Untitled",
      startTime: allDay ? "All day" : formatLocalTime(start, timezone),
      endTime:
        !allDay && end instanceof Date
          ? formatLocalTime(end, timezone)
          : undefined,
      location: String(item.location || "").trim() || undefined,
      url: item.htmlLink || undefined,
      allDay,
      source: "work",
    });
  }

  return out.sort((a, b) => {
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

export async function fetchGoogleCalendarEventsForDay(
  link: GoogleCalendarLink,
  date: string,
  timezone: string,
): Promise<WorkCalendarEvent[]> {
  const accessToken = await refreshGoogleAccessToken(link.refreshToken);
  const calendarId = encodeURIComponent(link.calendarId || "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
    timeMin: `${addDays(date, -1)}T00:00:00Z`,
    timeMax: `${addDays(date, 2)}T00:00:00Z`,
    timeZone: timezone,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
    },
  );

  const data = (await res.json()) as GoogleEventsListResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `Google Calendar failed (${res.status})`);
  }

  return mapGoogleEventsForDay(data.items ?? [], date, timezone);
}

export function buildGoogleCalendarLink(input: {
  refreshToken: string;
  accountEmail?: string;
  calendarId?: string;
}): GoogleCalendarLink {
  return {
    connectedAt: new Date().toISOString(),
    accountEmail: input.accountEmail,
    calendarId: input.calendarId?.trim() || "primary",
    refreshToken: input.refreshToken,
  };
}
