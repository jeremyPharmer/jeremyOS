import { describe, expect, it } from "vitest";
import {
  dateShortLabel,
  isSoccerSeason,
  mapMaxPrepsContest,
  matchupLabel,
  pickFeaturedGame,
  scheduleWhenLabel,
  selectScheduleWindow,
  type SoccerGame,
} from "./soccer";

describe("isSoccerSeason", () => {
  it("covers Aug 15 – Nov 15", () => {
    expect(isSoccerSeason("2026-08-15")).toBe(true);
    expect(isSoccerSeason("2026-09-15")).toBe(true);
    expect(isSoccerSeason("2026-11-15")).toBe(true);
    expect(isSoccerSeason("2026-08-14")).toBe(false);
    expect(isSoccerSeason("2026-11-16")).toBe(false);
    expect(isSoccerSeason("2026-01-10")).toBe(false);
  });
});

describe("mapMaxPrepsContest", () => {
  it("maps a completed away win", () => {
    const contest = [
      [
        [
          "x",
          "2c58e050-c5fb-40b4-8d11-38516dee237a",
          "s",
          null,
          1,
          "L",
          2,
          false,
          false,
          false,
          false,
          0,
          0,
          "https://example.com",
          "Victor",
          "Victor",
          "NY",
          "addr",
          "zip",
          "Victor (NY)",
          "mascot.gif",
          "Blue Devils",
          "034CB2",
          "C8880A",
          "VHS",
          "2c58e050-c5fb-40b4-8d11-38516dee237a",
          "contest-1",
          "s",
          "2c58e050-c5fb-40b4-8d11-38516dee237a",
          null,
          null,
          null,
        ],
        [
          "y",
          "9944dd24-fb57-4022-891c-5284e982482b",
          "s",
          null,
          2,
          "W",
          5,
          false,
          false,
          false,
          false,
          1,
          0,
          "https://example.com",
          "Webster Schroeder",
          "Webster",
          "NY",
          "addr",
          "zip",
          "Webster Schroeder",
          "mascot.gif",
          "Warriors",
          "034CB2",
          "C8880A",
          "WSHS",
          "9944dd24-fb57-4022-891c-5284e982482b",
          "contest-1",
          "s",
          "9944dd24-fb57-4022-891c-5284e982482b",
          null,
          null,
          null,
        ],
      ],
      "contest-1",
      "2026-06-30T01:09:30",
      false,
      true,
      "Victor High School",
      null,
      null,
      null,
      null,
      0,
      "2026-09-09T19:00:00",
    ];

    const game = mapMaxPrepsContest(contest);
    expect(game).not.toBeNull();
    expect(game!.opponentName).toBe("Victor");
    expect(game!.homeAway).toBe("away");
    expect(game!.status).toBe("post");
    expect(game!.usScore).toBe("5");
    expect(game!.opponentScore).toBe("2");
    expect(game!.weWon).toBe(true);
    expect(matchupLabel(game!)).toBe("@ VIC");
    expect(scheduleWhenLabel(game!)).toBe("W 5–2");
  });
});

describe("schedule window helpers", () => {
  const games: SoccerGame[] = [
    {
      id: "1",
      date: "2026-09-01T17:00:00",
      opponentAbbr: "BRO",
      opponentName: "Brockport",
      homeAway: "away",
      status: "post",
      usScore: "1",
      opponentScore: "1",
      weWon: null,
    },
    {
      id: "2",
      date: "2026-09-15T17:00:00",
      opponentAbbr: "RH",
      opponentName: "Rush-Henrietta",
      homeAway: "away",
      status: "pre",
      usScore: null,
      opponentScore: null,
      weWon: null,
    },
    {
      id: "3",
      date: "2026-09-17T19:00:00",
      opponentAbbr: "PEN",
      opponentName: "Penfield",
      homeAway: "home",
      status: "pre",
      usScore: null,
      opponentScore: null,
      weWon: null,
    },
  ];

  it("selects last completed + next upcoming", () => {
    const window = selectScheduleWindow(games, 2);
    expect(window.map((g) => g.id)).toEqual(["1", "2", "3"]);
  });

  it("returns the full season when upcomingCount is Infinite", () => {
    expect(selectScheduleWindow(games).map((g) => g.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("features the next upcoming game", () => {
    expect(pickFeaturedGame(games)?.id).toBe("2");
  });

  it("formats short date labels", () => {
    expect(dateShortLabel("2026-09-15T17:00:00")).toMatch(/9\/15/);
  });
});
