import { describe, expect, it } from "vitest";
import {
  computeRecordAndStreak,
  enrichMissingScores,
  fetchSoccerPanel,
  mapHudlScheduleEntry,
  scheduleWhenLabel,
  type SoccerGame,
} from "./soccer";

describe("mapHudlScheduleEntry", () => {
  it("maps an away loss", () => {
    const game = mapHudlScheduleEntry({
      scheduleEntryId: "e1",
      timeUtc: "2026-09-03T23:00:00.000Z",
      scheduleEntryLocation: 2,
      scheduleEntryOutcome: 2,
      score1: 1,
      score2: 2,
      opponentDetails: {
        name: " Irondequoit High School",
        shortName: "Irondequoit",
      },
    });
    expect(game).not.toBeNull();
    expect(game!.opponentName).toBe("Irondequoit");
    expect(game!.homeAway).toBe("away");
    expect(game!.status).toBe("post");
    expect(game!.usScore).toBe("1");
    expect(game!.opponentScore).toBe("2");
    expect(game!.weWon).toBe(false);
  });

  it("maps a home tie", () => {
    const game = mapHudlScheduleEntry({
      scheduleEntryId: "e2",
      timeUtc: "2026-09-05T23:00:00.000Z",
      scheduleEntryLocation: 1,
      scheduleEntryOutcome: 3,
      score1: 0,
      score2: 0,
      opponentDetails: { shortName: "Webster-Thomas" },
    });
    expect(game!.opponentName).toBe("Webster Thomas");
    expect(game!.homeAway).toBe("home");
    expect(game!.weWon).toBeNull();
    expect(game!.status).toBe("post");
  });

  it("marks a past kickoff as Final when Hudl outcome is still unknown", () => {
    const kickoff = "2026-09-19T21:00:00.000Z";
    const now = Date.parse(kickoff) + 4 * 60 * 60 * 1000;
    const game = mapHudlScheduleEntry(
      {
        scheduleEntryId: "pittsford",
        timeUtc: kickoff,
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 0,
        score1: null,
        score2: null,
        opponentDetails: { shortName: "Pittsford" },
      },
      now,
    );
    expect(game!.status).toBe("post");
    expect(game!.usScore).toBeNull();
    expect(game!.weWon).toBeNull();
    expect(scheduleWhenLabel(game!)).toBe("Final");
  });

  it("infers W/L from scores when Hudl left outcome unknown after kickoff", () => {
    const kickoff = "2026-09-17T23:00:00.000Z";
    const now = Date.parse(kickoff) + 5 * 60 * 60 * 1000;
    const game = mapHudlScheduleEntry(
      {
        scheduleEntryId: "penfield",
        timeUtc: kickoff,
        scheduleEntryLocation: 1,
        scheduleEntryOutcome: 0,
        score1: 3,
        score2: 1,
        opponentDetails: { shortName: "Penfield" },
      },
      now,
    );
    expect(game!.status).toBe("post");
    expect(game!.weWon).toBe(true);
    expect(scheduleWhenLabel(game!)).toBe("W 3–1");
  });

  it("treats the game as live during the post-kickoff grace window", () => {
    const kickoff = "2026-09-19T21:00:00.000Z";
    const now = Date.parse(kickoff) + 45 * 60 * 1000;
    const game = mapHudlScheduleEntry(
      {
        scheduleEntryId: "live",
        timeUtc: kickoff,
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 0,
        score1: 1,
        score2: 0,
        opponentDetails: { shortName: "Hilton" },
      },
      now,
    );
    expect(game!.status).toBe("in");
    expect(scheduleWhenLabel(game!)).toBe("Live 1–0");
  });
});

describe("computeRecordAndStreak", () => {
  it("builds W-L-T and streak", () => {
    const games = [
      mapHudlScheduleEntry({
        scheduleEntryId: "1",
        timeUtc: "2026-09-03T23:00:00.000Z",
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 2,
        score1: 1,
        score2: 2,
        opponentDetails: { shortName: "Irondequoit" },
      })!,
      mapHudlScheduleEntry({
        scheduleEntryId: "2",
        timeUtc: "2026-09-05T23:00:00.000Z",
        scheduleEntryLocation: 1,
        scheduleEntryOutcome: 3,
        score1: 0,
        score2: 0,
        opponentDetails: { shortName: "Thomas" },
      })!,
      mapHudlScheduleEntry({
        scheduleEntryId: "3",
        timeUtc: "2026-09-09T23:00:00.000Z",
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 1,
        score1: 5,
        score2: 2,
        opponentDetails: { shortName: "Victor" },
      })!,
      mapHudlScheduleEntry({
        scheduleEntryId: "4",
        timeUtc: "2026-09-12T22:00:00.000Z",
        scheduleEntryLocation: 1,
        scheduleEntryOutcome: 2,
        score1: 1,
        score2: 2,
        opponentDetails: { shortName: "McQuaid" },
      })!,
    ];
    expect(computeRecordAndStreak(games)).toEqual({
      record: "1-2-1",
      streak: "L1",
    });
  });

  it("does not count Final-without-score as a tie in the record", () => {
    const kickoff = "2026-09-19T21:00:00.000Z";
    const now = Date.parse(kickoff) + 4 * 60 * 60 * 1000;
    const pending = mapHudlScheduleEntry(
      {
        scheduleEntryId: "pending",
        timeUtc: kickoff,
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 0,
        opponentDetails: { shortName: "Pittsford" },
      },
      now,
    )!;
    const prior = mapHudlScheduleEntry({
      scheduleEntryId: "prior",
      timeUtc: "2026-09-17T23:00:00.000Z",
      scheduleEntryLocation: 1,
      scheduleEntryOutcome: 3,
      score1: 3,
      score2: 3,
      opponentDetails: { shortName: "Penfield" },
    })!;
    expect(computeRecordAndStreak([prior, pending])).toEqual({
      record: "0-0-1",
      streak: "T1",
    });
  });
});

describe("enrichMissingScores", () => {
  it("fills a blank Hudl Final from MaxPreps on the same calendar day", () => {
    const hudlBlank = mapHudlScheduleEntry(
      {
        scheduleEntryId: "pittsford",
        timeUtc: "2026-09-19T21:00:00.000Z",
        scheduleEntryLocation: 2,
        scheduleEntryOutcome: 0,
        score1: null,
        score2: null,
        opponentDetails: { shortName: "Pittsford" },
      },
      Date.parse("2026-09-19T21:00:00.000Z") + 4 * 60 * 60 * 1000,
    )!;
    expect(hudlBlank.usScore).toBeNull();
    expect(scheduleWhenLabel(hudlBlank)).toBe("Final");

    const maxPreps: SoccerGame = {
      id: "mp-mendon",
      date: "2026-09-19T17:00:00",
      opponentAbbr: "MEN",
      opponentName: "Mendon",
      homeAway: "away",
      status: "post",
      usScore: "0",
      opponentScore: "0",
      weWon: null,
    };

    const [filled] = enrichMissingScores([hudlBlank], [maxPreps]);
    expect(filled!.usScore).toBe("0");
    expect(filled!.opponentScore).toBe("0");
    expect(filled!.weWon).toBeNull();
    expect(scheduleWhenLabel(filled!)).toBe("T 0–0");
    expect(filled!.opponentName).toBe("Pittsford");
  });
});

describe("fetchSoccerPanel (live Hudl)", () => {
  it("returns the Warriors schedule starting with Irondequoit", async () => {
    const panel = await fetchSoccerPanel("2026-09-15");
    expect(panel).not.toBeNull();
    expect(panel!.games.length).toBeGreaterThan(5);
    expect(panel!.games[0]!.opponentName.toLowerCase()).toContain("irondequoit");
    expect(panel!.clubhouseUrl).toContain("hudl.com");
    expect(panel!.record).not.toBe("—");
  }, 20000);

  it("fills Pittsford score from MaxPreps when Hudl outcome lags", async () => {
    const panel = await fetchSoccerPanel("2026-09-20");
    expect(panel).not.toBeNull();
    const pittsford = panel!.games.find(
      (g) =>
        /pittsford/i.test(g.opponentName) &&
        g.date.startsWith("2026-09-19"),
    );
    expect(pittsford).toBeTruthy();
    expect(pittsford!.status).toBe("post");
    expect(pittsford!.usScore).toBe("0");
    expect(pittsford!.opponentScore).toBe("0");
    expect(scheduleWhenLabel(pittsford!)).toBe("T 0–0");
  }, 20000);
});
