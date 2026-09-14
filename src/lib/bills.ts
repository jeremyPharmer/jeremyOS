/**
 * Buffalo Bills Home panel (RB-034) — ESPN public site API, fail soft.
 */

import { isBillsSeason } from "./news";

export const BILLS_ESPN_CLUBHOUSE =
  "https://www.espn.com/nfl/team/_/name/buf/buffalo-bills";

const SCHEDULE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/buf/schedule";
const TEAM_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/buf";

const FETCH_MS = 8_000;
const REVALIDATE_SEC = 300;

export type BillsGameStatus = "pre" | "in" | "post";

export type BillsGame = {
  id: string;
  date: string;
  weekLabel: string;
  opponentAbbr: string;
  opponentName: string;
  homeAway: "home" | "away";
  status: BillsGameStatus;
  statusDetail: string;
  billsScore: string | null;
  opponentScore: string | null;
  billsWon: boolean | null;
};

export type BillsPanel = {
  inSeason: boolean;
  record: string;
  standing: string;
  streak: string;
  games: BillsGame[];
  clubhouseUrl: string;
  logoUrl: string | null;
};

type EspnCompetitor = {
  homeAway?: string;
  winner?: boolean | null;
  score?: { displayValue?: string; value?: number } | string | null;
  team?: {
    abbreviation?: string;
    shortDisplayName?: string;
    nickname?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  shortName?: string;
  week?: { number?: number; text?: string };
  competitions?: Array<{
    date?: string;
    status?: {
      type?: {
        state?: string;
        completed?: boolean;
        detail?: string;
        shortDetail?: string;
        description?: string;
      };
    };
    competitors?: EspnCompetitor[];
  }>;
};

type EspnSchedulePayload = {
  team?: {
    recordSummary?: string;
    standingSummary?: string;
    clubhouse?: string;
    logo?: string;
  };
  events?: EspnEvent[];
};

type EspnTeamPayload = {
  team?: {
    record?: {
      items?: Array<{
        type?: string;
        summary?: string;
        stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
      }>;
    };
    logos?: Array<{ href?: string; rel?: string[] }>;
  };
};

function scoreDisplay(
  score: EspnCompetitor["score"],
): string | null {
  if (score == null) return null;
  if (typeof score === "string") return score || null;
  if (typeof score.displayValue === "string" && score.displayValue !== "") {
    return score.displayValue;
  }
  if (typeof score.value === "number" && Number.isFinite(score.value)) {
    return String(Math.round(score.value));
  }
  return null;
}

export function formatStreak(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "—";
  const n = Math.trunc(value);
  if (n > 0) return `W${n}`;
  return `L${Math.abs(n)}`;
}

export function mapEspnEvent(event: EspnEvent): BillsGame | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  if (competitors.length < 2) return null;

  const bills = competitors.find((c) => c.team?.abbreviation === "BUF");
  const opponent = competitors.find((c) => c.team?.abbreviation !== "BUF");
  if (!bills || !opponent) return null;

  const stateRaw = competition?.status?.type?.state ?? "pre";
  const status: BillsGameStatus =
    stateRaw === "in" || stateRaw === "post" ? stateRaw : "pre";

  const homeAway: "home" | "away" =
    bills.homeAway === "home" ? "home" : "away";

  const weekText = event.week?.text?.trim();
  const weekLabel =
    weekText ||
    (event.week?.number != null ? `Week ${event.week.number}` : "Game");

  const statusDetail =
    competition?.status?.type?.shortDetail ||
    competition?.status?.type?.detail ||
    competition?.status?.type?.description ||
    "";

  return {
    id: String(event.id ?? `${event.date ?? ""}-${event.shortName ?? ""}`),
    date: competition?.date || event.date || "",
    weekLabel,
    opponentAbbr: opponent.team?.abbreviation ?? "OPP",
    opponentName:
      opponent.team?.shortDisplayName ||
      opponent.team?.nickname ||
      opponent.team?.abbreviation ||
      "Opponent",
    homeAway,
    status,
    statusDetail,
    billsScore: scoreDisplay(bills.score),
    opponentScore: scoreDisplay(opponent.score),
    billsWon: typeof bills.winner === "boolean" ? bills.winner : null,
  };
}

/** Last completed + next upcoming; prefer live game when in progress. */
export function selectScheduleWindow(
  games: BillsGame[],
  upcomingCount = 6,
): BillsGame[] {
  const live = games.filter((g) => g.status === "in");
  const completed = games.filter((g) => g.status === "post");
  const upcoming = games.filter((g) => g.status === "pre");

  const lastCompleted =
    completed.length > 0 ? [completed[completed.length - 1]!] : [];
  const nextUpcoming = upcoming.slice(0, Math.max(0, upcomingCount));

  if (live.length > 0) {
    // Live replaces "last" when it is the current game; still show upcoming after.
    return [...live, ...nextUpcoming].slice(0, 1 + upcomingCount);
  }

  return [...lastCompleted, ...nextUpcoming];
}

/** Featured game for the Home bulletin: live → next kickoff → last result. */
export function pickFeaturedGame(games: BillsGame[]): BillsGame | null {
  const live = games.find((g) => g.status === "in");
  if (live) return live;
  const next = games.find((g) => g.status === "pre");
  if (next) return next;
  const completed = games.filter((g) => g.status === "post");
  return completed.length > 0 ? completed[completed.length - 1]! : null;
}

export function matchupLabel(game: BillsGame): string {
  return game.homeAway === "home"
    ? `vs ${game.opponentAbbr}`
    : `@ ${game.opponentAbbr}`;
}

export function tickerLabel(game: BillsGame): string {
  const shortWeek = game.weekLabel.replace(/^Week\s+/i, "Wk ");
  return `${shortWeek} ${matchupLabel(game)}`;
}

/**
 * Three short bullets for the featured game bulletin.
 * Order: place (home/away + week), kickoff/live/final, streak/record vibe.
 */
export function featuredBullets(
  game: BillsGame,
  streak: string,
  record: string,
): string[] {
  const place =
    game.homeAway === "home"
      ? `${game.weekLabel} · Home`
      : `${game.weekLabel} · Away`;

  let beat: string;
  if (game.status === "in") {
    const score =
      game.billsScore != null && game.opponentScore != null
        ? `${game.billsScore}–${game.opponentScore}`
        : "";
    beat = score
      ? `Live ${score}${game.statusDetail ? ` · ${game.statusDetail}` : ""}`
      : game.statusDetail || "Live now";
  } else if (game.status === "post") {
    if (game.billsScore != null && game.opponentScore != null) {
      const tag =
        game.billsWon === true ? "W" : game.billsWon === false ? "L" : "";
      beat = tag
        ? `Final ${tag} ${game.billsScore}–${game.opponentScore}`
        : `Final ${game.billsScore}–${game.opponentScore}`;
    } else {
      beat = game.statusDetail || "Final";
    }
  } else {
    beat = game.statusDetail || "Kickoff TBD";
  }

  let vibe: string;
  if (game.status === "pre") {
    if (streak && streak !== "—") {
      vibe = streak.startsWith("W")
        ? `Riding a ${streak}`
        : streak.startsWith("L")
          ? `Looking to snap ${streak}`
          : `Streak ${streak}`;
    } else if (record && record !== "—") {
      vibe = `Season ${record}`;
    } else {
      vibe = "Go Bills";
    }
  } else if (game.status === "in") {
    vibe = streak && streak !== "—" ? `Streak ${streak}` : "Go Bills";
  } else {
    vibe =
      game.billsWon === true
        ? "Bills win — keep rolling"
        : game.billsWon === false
          ? "Shake it off — next one"
          : record && record !== "—"
            ? `Season ${record}`
            : "Go Bills";
  }

  return [place, beat, vibe];
}

function streakFromTeamPayload(payload: EspnTeamPayload): string {
  const total = payload.team?.record?.items?.find((i) => i.type === "total");
  const streakStat = total?.stats?.find((s) => s.name === "streak");
  if (streakStat?.displayValue) return streakStat.displayValue;
  return formatStreak(streakStat?.value);
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SEC },
    });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBillsPanel(isoDate: string): Promise<BillsPanel | null> {
  if (!isBillsSeason(isoDate)) {
    return null;
  }

  try {
    const [schedule, team] = await Promise.all([
      fetchJson<EspnSchedulePayload>(SCHEDULE_URL),
      fetchJson<EspnTeamPayload>(TEAM_URL),
    ]);

    const mapped = (schedule.events ?? [])
      .map(mapEspnEvent)
      .filter((g): g is BillsGame => g != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const logo =
      team.team?.logos?.find((l) => l.rel?.includes("default"))?.href ||
      schedule.team?.logo ||
      null;

    return {
      inSeason: true,
      record: schedule.team?.recordSummary || "—",
      standing: schedule.team?.standingSummary || "—",
      streak: streakFromTeamPayload(team),
      games: selectScheduleWindow(mapped, 6),
      clubhouseUrl: schedule.team?.clubhouse || BILLS_ESPN_CLUBHOUSE,
      logoUrl: logo,
    };
  } catch {
    return {
      inSeason: true,
      record: "—",
      standing: "—",
      streak: "—",
      games: [],
      clubhouseUrl: BILLS_ESPN_CLUBHOUSE,
      logoUrl: null,
    };
  }
}
