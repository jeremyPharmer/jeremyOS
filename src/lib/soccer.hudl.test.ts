import { describe, expect, it } from "vitest";
import {
  computeRecordAndStreak,
  fetchSoccerPanel,
  mapHudlScheduleEntry,
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
});
