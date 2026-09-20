/**
 * Webster Schroeder Warriors varsity boys soccer Home panel (RB-035).
 * Hudl Fan schedule via public GraphQL; fail soft.
 */

export const SCHROEDER_HUDL_CLUBHOUSE =
  "https://fan.hudl.com/usa/ny/webster/organization/14887/webster-schroeder-high-school/team/76442/boys-varsity-soccer";

/** MaxPreps URLs kept for tests / legacy contest mapping. */
export const SCHROEDER_MAXPREPS_SCHEDULE =
  "https://www.maxpreps.com/ny/webster/webster-schroeder-warriors/soccer/schedule/";
export const SCHROEDER_MAXPREPS_HOME =
  "https://www.maxpreps.com/ny/webster/webster-schroeder-warriors/soccer/";

const HUDL_GRAPHQL = "https://core.hudl.com/api/public/graphql/query";
const HUDL_INTERNAL_TEAM_ID = "76442";

const FETCH_MS = 8_000;
/** Keep short so last night’s final isn’t stuck behind a long cache. */
const REVALIDATE_SEC = 60;
/**
 * After kickoff, treat the game as live until this grace elapses, then post —
 * even if Hudl still reports outcome UNKNOWN (common overnight lag).
 */
export const SOCCER_POST_GRACE_MS = 3 * 60 * 60 * 1000;

/** MaxPreps team id (legacy mapper / tests). */
const MAXPREPS_TEAM_ID = "9944dd24-fb57-4022-891c-5284e982482b";

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

export function abbreviateOpponent(name: string): string {
  const cleaned = name.replace(/^Webster\s+/i, "").trim();
  if (cleaned.length <= 4) return cleaned.toUpperCase();
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function cleanOpponentName(raw: string): string {
  return raw
    .replace(/\s+High School$/i, "")
    .replace(/^Webster-/i, "Webster ")
    .replace(/\s+/g, " ")
    .trim();
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

function teamIdOf(row: TeamRow): string {
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
  const teams = contest[0];
  if (Array.isArray(teams)) {
    for (const row of teams) {
      if (isTeamRow(row) && typeof row[26] === "string") return row[26];
    }
  }
  return contestKickoff(contest);
}

/** Legacy MaxPreps contest mapper (unit tests). */
export function mapMaxPrepsContest(contest: unknown): SoccerGame | null {
  if (!Array.isArray(contest) || contest.length < 2) return null;
  const teams = contest[0];
  if (!Array.isArray(teams) || teams.length < 2) return null;

  const rows = teams.filter(isTeamRow);
  const us = rows.find((r) => teamIdOf(r) === MAXPREPS_TEAM_ID);
  const opp = rows.find((r) => teamIdOf(r) !== MAXPREPS_TEAM_ID);
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

/** Hudl scheduleEntryLocation: 1 HOME, 2 AWAY (also accept string enums). */
export function mapHudlLocation(location: unknown): "home" | "away" | null {
  if (location === 1 || location === "HOME" || location === "home") return "home";
  if (location === 2 || location === "AWAY" || location === "away") return "away";
  if (location === 3 || location === "NEUTRAL" || location === "neutral") {
    return "home";
  }
  return null;
}

/** Hudl scheduleEntryOutcome: 0 UNKNOWN, 1 WIN, 2 LOSS, 3 TIE. */
export function mapHudlOutcome(outcome: unknown): {
  status: SoccerGameStatus;
  weWon: boolean | null;
} {
  if (outcome === 1 || outcome === "WIN") {
    return { status: "post", weWon: true };
  }
  if (outcome === 2 || outcome === "LOSS") {
    return { status: "post", weWon: false };
  }
  if (outcome === 3 || outcome === "TIE") {
    return { status: "post", weWon: null };
  }
  return { status: "pre", weWon: null };
}

export type HudlScheduleEntry = {
  id?: string | null;
  internalId?: string | null;
  scheduleEntryId?: string | null;
  timeUtc?: string | null;
  isTimeTba?: boolean | null;
  scheduleEntryLocation?: unknown;
  scheduleEntryOutcome?: unknown;
  score1?: number | string | null;
  score2?: number | string | null;
  opponentDetails?: {
    name?: string | null;
    shortName?: string | null;
    abbreviation?: string | null;
  } | null;
};

function scoreToString(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v !== "") return v;
  return null;
}

/** Infer W/L/T from scores when Hudl left outcome unset. */
export function inferWeWonFromScores(
  score1: unknown,
  score2: unknown,
): boolean | null {
  const us = scoreToString(score1);
  const opp = scoreToString(score2);
  if (us == null || opp == null) return null;
  const a = Number(us);
  const b = Number(opp);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a > b) return true;
  if (a < b) return false;
  return null;
}

/**
 * When Hudl still says UNKNOWN, advance pre → in → post from kickoff time
 * so past games never linger as upcoming on Home.
 */
export function resolveHudlStatus(
  entry: Pick<
    HudlScheduleEntry,
    "timeUtc" | "scheduleEntryOutcome" | "score1" | "score2"
  >,
  nowMs: number = Date.now(),
  postGraceMs: number = SOCCER_POST_GRACE_MS,
): { status: SoccerGameStatus; weWon: boolean | null } {
  const fromHudl = mapHudlOutcome(entry.scheduleEntryOutcome);
  if (fromHudl.status === "post") return fromHudl;

  const kickoff = entry.timeUtc ? Date.parse(entry.timeUtc) : NaN;
  if (!Number.isFinite(kickoff)) return fromHudl;

  const elapsed = nowMs - kickoff;
  if (elapsed < 0) return fromHudl;
  if (elapsed < postGraceMs) {
    return { status: "in", weWon: null };
  }

  const weWon = inferWeWonFromScores(entry.score1, entry.score2);
  return { status: "post", weWon };
}

export function mapHudlScheduleEntry(
  entry: HudlScheduleEntry,
  nowMs: number = Date.now(),
): SoccerGame | null {
  const rawName =
    entry.opponentDetails?.shortName ||
    entry.opponentDetails?.name ||
    "Opponent";
  const name = cleanOpponentName(rawName);
  const homeAway = mapHudlLocation(entry.scheduleEntryLocation);
  if (!homeAway) return null;
  if (!entry.timeUtc) return null;

  const { status, weWon } = resolveHudlStatus(entry, nowMs);
  const showScore = status === "post" || status === "in";
  const usScore = showScore ? scoreToString(entry.score1) : null;
  const opponentScore = showScore ? scoreToString(entry.score2) : null;

  const id =
    entry.scheduleEntryId ||
    entry.id ||
    entry.internalId ||
    `${entry.timeUtc}-${name}`;

  return {
    id: String(id),
    date: entry.timeUtc,
    opponentAbbr: abbreviateOpponent(name),
    opponentName: name,
    homeAway,
    status,
    usScore,
    opponentScore,
    weWon: status === "post" ? weWon : null,
  };
}

/**
 * Optional window helper (tests). Full season = pass Infinity / omit —
 * same contract as Bills so Home can show past results + upcoming.
 */
export function selectScheduleWindow(
  games: SoccerGame[],
  upcomingCount = Number.POSITIVE_INFINITY,
): SoccerGame[] {
  if (!Number.isFinite(upcomingCount)) return games;

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

/** True when a post game has a known W/L/T (not “Final” awaiting Hudl). */
export function hasKnownSoccerResult(game: SoccerGame): boolean {
  if (game.status !== "post") return false;
  if (game.weWon === true || game.weWon === false) return true;
  return game.usScore != null && game.opponentScore != null;
}

export function computeRecordAndStreak(games: SoccerGame[]): {
  record: string;
  streak: string;
} {
  const completed = games.filter(hasKnownSoccerResult);
  let w = 0;
  let l = 0;
  let t = 0;
  for (const g of completed) {
    if (g.weWon === true) w += 1;
    else if (g.weWon === false) l += 1;
    else t += 1;
  }
  const record =
    completed.length === 0 ? "—" : t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;

  if (completed.length === 0) return { record, streak: "—" };

  const last = completed[completed.length - 1]!;
  const letter = last.weWon === true ? "W" : last.weWon === false ? "L" : "T";
  let streakCount = 0;
  for (let i = completed.length - 1; i >= 0; i--) {
    const g = completed[i]!;
    const gLetter = g.weWon === true ? "W" : g.weWon === false ? "L" : "T";
    if (gLetter !== letter) break;
    streakCount += 1;
  }
  return { record, streak: `${letter}${streakCount}` };
}

type HudlTeamHeader = {
  id: string;
  currentSeason?: { seasonId?: string | null } | null;
};

async function hudlGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(HUDL_GRAPHQL, {
      method: "POST",
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SEC },
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        origin: "https://fan.hudl.com",
        referer: "https://fan.hudl.com/",
        "user-agent":
          "Mozilla/5.0 (compatible; JeremyOS/1.0; +https://jeremyos-prod.fly.dev)",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Hudl GraphQL ${res.status}`);
    const json = (await res.json()) as {
      data?: T;
      errors?: { message?: string }[];
    };
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message || "Hudl GraphQL error");
    }
    if (!json.data) throw new Error("Hudl GraphQL empty");
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHudlTeamHeader(): Promise<HudlTeamHeader> {
  const data = await hudlGraphql<{ teamHeader: HudlTeamHeader | null }>(
    `query ($internalTeamId: String) {
      teamHeader(internalTeamId: $internalTeamId) {
        id
        currentSeason { seasonId }
      }
    }`,
    { internalTeamId: HUDL_INTERNAL_TEAM_ID },
  );
  if (!data.teamHeader?.id) throw new Error("Hudl team not found");
  return data.teamHeader;
}

async function fetchHudlScheduleEntries(
  teamId: string,
  seasonId: string,
): Promise<HudlScheduleEntry[]> {
  const data = await hudlGraphql<{
    scheduleEntryPublicSummaries: { items: HudlScheduleEntry[] };
  }>(
    `query ($input: GetScheduleEntryPublicSummariesInput!) {
      scheduleEntryPublicSummaries(input: $input) {
        items {
          id
          internalId
          scheduleEntryId
          timeUtc
          isTimeTba
          gameType
          score1
          score2
          scheduleEntryLocation
          scheduleEntryOutcome
          opponentDetails {
            name
            shortName
            abbreviation
          }
        }
      }
    }`,
    {
      input: {
        teamIds: [teamId],
        seasonIds: [seasonId],
        first: 50,
        sortByAscending: true,
        sortType: "SCHEDULE_ENTRY_DATE",
      },
    },
  );
  return Array.isArray(data.scheduleEntryPublicSummaries?.items)
    ? data.scheduleEntryPublicSummaries.items
    : [];
}

export async function fetchSoccerPanel(
  isoDate: string,
): Promise<SoccerPanel | null> {
  if (!isSoccerSeason(isoDate)) return null;

  try {
    const header = await fetchHudlTeamHeader();
    const seasonId = header.currentSeason?.seasonId;
    if (!seasonId) throw new Error("Hudl season missing");

    const entries = await fetchHudlScheduleEntries(header.id, seasonId);
    const nowMs = Date.now();
    const games = entries
      .map((entry) => mapHudlScheduleEntry(entry, nowMs))
      .filter((g): g is SoccerGame => g != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const { record, streak } = computeRecordAndStreak(games);

    return {
      inSeason: true,
      record,
      standing: "—",
      streak,
      games,
      clubhouseUrl: SCHROEDER_HUDL_CLUBHOUSE,
    };
  } catch {
    return {
      inSeason: true,
      record: "—",
      standing: "—",
      streak: "—",
      games: [],
      clubhouseUrl: SCHROEDER_HUDL_CLUBHOUSE,
    };
  }
}
