/**
 * Webster Schroeder varsity boys soccer Home panel (RB-035).
 * MaxPreps schedule/standings via public pages; fail soft.
 */

export const SCHROEDER_MAXPREPS_SCHEDULE =
  "https://www.maxpreps.com/ny/webster/webster-schroeder-warriors/soccer/schedule/";
export const SCHROEDER_MAXPREPS_HOME =
  "https://www.maxpreps.com/ny/webster/webster-schroeder-warriors/soccer/";

const SCHEDULE_URL = SCHROEDER_MAXPREPS_SCHEDULE;
const HOME_URL = SCHROEDER_MAXPREPS_HOME;
const TEAM_ID = "9944dd24-fb57-4022-891c-5284e982482b";

const FETCH_MS = 8_000;
const REVALIDATE_SEC = 300;

export type SoccerGameStatus = "pre" | "in" | "post";

export type SoccerGame = {
  id: string;
  date: string;
  opponentAbbr: string;
  opponentName: string;
  homeAway: "home" | "away";
  status: SoccerGameStatus;
  usScore: string | null;
  opponentScore: string | null;
  weWon: boolean | null;
};

export type SoccerPanel = {
  inSeason: boolean;
  record: string;
  standing: string;
  streak: string;
  games: SoccerGame[];
  clubhouseUrl: string;
};

/** Fall soccer window: Aug 15 – Nov 15 inclusive. */
export function isSoccerSeason(isoDate: string): boolean {
  const md = isoDate.slice(5);
  if (!/^\d{2}-\d{2}$/.test(md)) return false;
  return md >= "08-15" && md <= "11-15";
}

function abbreviateOpponent(name: string): string {
  const cleaned = name.replace(/^Webster\s+/i, "").trim();
  if (cleaned.length <= 4) return cleaned.toUpperCase();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

type TeamRow = unknown[];

function isTeamRow(v: unknown): v is TeamRow {
  return Array.isArray(v) && v.length >= 25;
}

function teamResult(row: TeamRow): string | null {
  const r = row[5];
  return typeof r === "string" ? r : null;
}

function teamScore(row: TeamRow): string | null {
  const s = row[6];
  if (typeof s === "number" && Number.isFinite(s)) return String(s);
  if (typeof s === "string" && s !== "") return s;
  return null;
}

function teamIsAway(row: TeamRow): boolean {
  return row[11] === 1;
}

function teamName(row: TeamRow): string {
  return typeof row[14] === "string" ? row[14] : "Opponent";
}

function teamId(row: TeamRow): string {
  return typeof row[1] === "string" ? row[1] : "";
}

function contestKickoff(contest: unknown[]): string {
  const dts = contest.filter(
    (x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}T/.test(x),
  );
  // Prefer the later datetime (kickoff); first is often a metadata stamp.
  return dts.length > 0 ? dts[dts.length - 1]! : "";
}

function contestId(contest: unknown[]): string {
  for (const x of contest) {
    if (typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x) && x !== TEAM_ID) {
      // Prefer contest ids that appear after the team pair.
    }
  }
  const teams = contest[0];
  if (Array.isArray(teams)) {
    for (const row of teams) {
      if (isTeamRow(row) && typeof row[26] === "string") return row[26];
    }
  }
  return contestKickoff(contest);
}

export function mapMaxPrepsContest(contest: unknown): SoccerGame | null {
  if (!Array.isArray(contest) || contest.length < 2) return null;
  const teams = contest[0];
  if (!Array.isArray(teams) || teams.length < 2) return null;

  const rows = teams.filter(isTeamRow);
  const us = rows.find((r) => teamId(r) === TEAM_ID);
  const opp = rows.find((r) => teamId(r) !== TEAM_ID);
  if (!us || !opp) return null;

  const result = teamResult(us);
  const status: SoccerGameStatus =
    result === "W" || result === "L" || result === "T" ? "post" : "pre";

  const usScore = teamScore(us);
  const oppScore = teamScore(opp);
  let weWon: boolean | null = null;
  if (result === "W") weWon = true;
  else if (result === "L") weWon = false;
  else if (result === "T") weWon = null;

  const name = teamName(opp);

  return {
    id: contestId(contest),
    date: contestKickoff(contest),
    opponentAbbr: abbreviateOpponent(name),
    opponentName: name,
    homeAway: teamIsAway(us) ? "away" : "home",
    status,
    usScore,
    opponentScore: oppScore,
    weWon: result === "T" ? null : weWon,
  };
}

/** Last completed + next `upcomingCount` (or live + upcoming). */
export function selectScheduleWindow(
  games: SoccerGame[],
  upcomingCount = 3,
): SoccerGame[] {
  const live = games.filter((g) => g.status === "in");
  const completed = games.filter((g) => g.status === "post");
  const upcoming = games.filter((g) => g.status === "pre");

  const lastCompleted =
    completed.length > 0 ? [completed[completed.length - 1]!] : [];
  const nextUpcoming = upcoming.slice(0, Math.max(0, upcomingCount));

  if (live.length > 0) {
    return [...live, ...nextUpcoming].slice(0, 1 + upcomingCount);
  }
  return [...lastCompleted, ...nextUpcoming];
}

export function pickFeaturedGame(games: SoccerGame[]): SoccerGame | null {
  const live = games.find((g) => g.status === "in");
  if (live) return live;
  const next = games.find((g) => g.status === "pre");
  if (next) return next;
  const completed = games.filter((g) => g.status === "post");
  return completed.length > 0 ? completed[completed.length - 1]! : null;
}

export function matchupLabel(game: SoccerGame): string {
  return game.homeAway === "home"
    ? `vs ${game.opponentAbbr}`
    : `@ ${game.opponentAbbr}`;
}

export function dateShortLabel(
  isoDate: string,
  timeZone = "America/New_York",
): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone,
  }).format(d);
}

export function scheduleWhenLabel(
  game: SoccerGame,
  timeZone = "America/New_York",
): string {
  if (game.status === "post") {
    if (game.usScore != null && game.opponentScore != null) {
      if (game.weWon === true) return `W ${game.usScore}–${game.opponentScore}`;
      if (game.weWon === false)
        return `L ${game.usScore}–${game.opponentScore}`;
      return `T ${game.usScore}–${game.opponentScore}`;
    }
    return "Final";
  }
  if (game.status === "in") {
    if (game.usScore != null && game.opponentScore != null) {
      return `Live ${game.usScore}–${game.opponentScore}`;
    }
    return "Live";
  }
  const d = new Date(game.date);
  if (Number.isNaN(d.getTime())) return "TBD";
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(d);
  const rest = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
  return `${day} · ${rest}`;
}

function formatStreak(streak: number, result: string): string {
  if (!streak || streak === 0) return "—";
  const letter =
    result === "W" || result === "L" || result === "T" ? result : "W";
  return `${letter}${streak}`;
}

function extractNextData(html: string): unknown | null {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as unknown;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SEC },
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; JeremyOS/1.0; +https://jeremyos-prod.fly.dev)",
        accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`MaxPreps ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

type StandingsBlob = {
  overallStanding?: {
    overallWinLossTies?: string;
    streak?: number;
    streakResult?: string;
  };
  leagueStanding?: {
    leagueName?: string;
    conferenceStandingPlacement?: string;
  };
};

function standingsFromHome(data: unknown): {
  record: string;
  standing: string;
  streak: string;
} {
  const blob = (
    data as {
      props?: {
        pageProps?: { teamContext?: { standingsData?: StandingsBlob } };
      };
    }
  )?.props?.pageProps?.teamContext?.standingsData;
  const overall = blob?.overallStanding;
  const league = blob?.leagueStanding;
  const record = overall?.overallWinLossTies || "—";
  const placement = league?.conferenceStandingPlacement;
  const leagueName = league?.leagueName;
  const standing =
    placement && leagueName
      ? `${placement} in ${leagueName}`
      : placement || leagueName || "—";
  const streak = formatStreak(
    overall?.streak ?? 0,
    overall?.streakResult ?? "",
  );
  return { record, standing, streak };
}

function contestsFromSchedule(data: unknown): unknown[] {
  const contests = (
    data as { props?: { pageProps?: { contests?: unknown } } }
  )?.props?.pageProps?.contests;
  return Array.isArray(contests) ? contests : [];
}

export async function fetchSoccerPanel(
  isoDate: string,
): Promise<SoccerPanel | null> {
  if (!isSoccerSeason(isoDate)) return null;

  try {
    const [schedHtml, homeHtml] = await Promise.all([
      fetchHtml(SCHEDULE_URL),
      fetchHtml(HOME_URL),
    ]);
    const schedData = extractNextData(schedHtml);
    const homeData = extractNextData(homeHtml);

    const mapped = contestsFromSchedule(schedData)
      .map(mapMaxPrepsContest)
      .filter((g): g is SoccerGame => g != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const { record, standing, streak } = homeData
      ? standingsFromHome(homeData)
      : { record: "—", standing: "—", streak: "—" };

    return {
      inSeason: true,
      record,
      standing,
      streak,
      games: selectScheduleWindow(mapped, 3),
      clubhouseUrl: SCHROEDER_MAXPREPS_HOME,
    };
  } catch {
    return {
      inSeason: true,
      record: "—",
      standing: "—",
      streak: "—",
      games: [],
      clubhouseUrl: SCHROEDER_MAXPREPS_HOME,
    };
  }
}
