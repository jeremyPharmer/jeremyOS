import { describe, expect, it } from "vitest";
import {
  featuredBullets,
  formatStreak,
  mapEspnEvent,
  pickFeaturedGame,
  selectScheduleWindow,
  type BillsGame,
} from "./bills";

function game(
  partial: Partial<BillsGame> & Pick<BillsGame, "id" | "status" | "date">,
): BillsGame {
  return {
    weekLabel: "Week 1",
    opponentAbbr: "HOU",
    opponentName: "Texans",
    homeAway: "away",
    statusDetail: "",
    billsScore: null,
    opponentScore: null,
    billsWon: null,
    ...partial,
  };
}

describe("formatStreak", () => {
  it("formats win and loss streaks", () => {
    expect(formatStreak(3)).toBe("W3");
    expect(formatStreak(-2)).toBe("L2");
    expect(formatStreak(0)).toBe("—");
    expect(formatStreak(null)).toBe("—");
  });
});

describe("mapEspnEvent", () => {
  it("maps a final Bills away win", () => {
    const mapped = mapEspnEvent({
      id: "401",
      date: "2026-09-13T17:00Z",
      week: { number: 1, text: "Week 1" },
      competitions: [
        {
          date: "2026-09-13T17:00Z",
          status: {
            type: {
              state: "post",
              completed: true,
              shortDetail: "Final",
            },
          },
          competitors: [
            {
              homeAway: "home",
              winner: false,
              score: { displayValue: "31" },
              team: { abbreviation: "HOU", shortDisplayName: "Texans" },
            },
            {
              homeAway: "away",
              winner: true,
              score: { displayValue: "36" },
              team: { abbreviation: "BUF", shortDisplayName: "Bills" },
            },
          ],
        },
      ],
    });

    expect(mapped).toMatchObject({
      id: "401",
      opponentAbbr: "HOU",
      homeAway: "away",
      status: "post",
      billsScore: "36",
      opponentScore: "31",
      billsWon: true,
      weekLabel: "Week 1",
    });
  });

  it("maps a scheduled home game", () => {
    const mapped = mapEspnEvent({
      id: "402",
      date: "2026-09-18T00:15Z",
      week: { number: 2, text: "Week 2" },
      competitions: [
        {
          status: {
            type: {
              state: "pre",
              shortDetail: "9/17 - 8:15 PM EDT",
            },
          },
          competitors: [
            {
              homeAway: "home",
              team: { abbreviation: "BUF", shortDisplayName: "Bills" },
            },
            {
              homeAway: "away",
              team: { abbreviation: "DET", shortDisplayName: "Lions" },
            },
          ],
        },
      ],
    });

    expect(mapped).toMatchObject({
      opponentAbbr: "DET",
      homeAway: "home",
      status: "pre",
      billsScore: null,
      statusDetail: "9/17 - 8:15 PM EDT",
    });
  });
});

describe("selectScheduleWindow", () => {
  it("returns last completed plus next three upcoming", () => {
    const games = [
      game({ id: "1", date: "2026-09-06", status: "post" }),
      game({ id: "2", date: "2026-09-13", status: "post" }),
      game({ id: "3", date: "2026-09-18", status: "pre" }),
      game({ id: "4", date: "2026-09-27", status: "pre" }),
      game({ id: "5", date: "2026-10-04", status: "pre" }),
      game({ id: "6", date: "2026-10-11", status: "pre" }),
    ];
    const window = selectScheduleWindow(games, 3);
    expect(window.map((g) => g.id)).toEqual(["2", "3", "4", "5"]);
  });

  it("prefers live game over last completed", () => {
    const games = [
      game({ id: "1", date: "2026-09-13", status: "post" }),
      game({ id: "2", date: "2026-09-18", status: "in" }),
      game({ id: "3", date: "2026-09-27", status: "pre" }),
    ];
    const window = selectScheduleWindow(games, 3);
    expect(window.map((g) => g.id)).toEqual(["2", "3"]);
  });
});

describe("pickFeaturedGame", () => {
  it("prefers live, then next kickoff, then last result", () => {
    const games = [
      game({ id: "1", date: "2026-09-13", status: "post" }),
      game({ id: "2", date: "2026-09-18", status: "pre" }),
      game({ id: "3", date: "2026-09-27", status: "pre" }),
    ];
    expect(pickFeaturedGame(games)?.id).toBe("2");
    expect(
      pickFeaturedGame([
        game({ id: "1", date: "2026-09-13", status: "post" }),
        game({ id: "2", date: "2026-09-18", status: "in" }),
      ])?.id,
    ).toBe("2");
    expect(
      pickFeaturedGame([game({ id: "1", date: "2026-09-13", status: "post" })])
        ?.id,
    ).toBe("1");
  });
});

describe("featuredBullets", () => {
  it("returns three next-game bullets", () => {
    const next = game({
      id: "2",
      date: "2026-09-18",
      status: "pre",
      homeAway: "home",
      weekLabel: "Week 2",
      opponentAbbr: "DET",
      statusDetail: "9/17 - 8:15 PM EDT",
    });
    expect(featuredBullets(next, "W1", "1-0")).toEqual([
      "Week 2 · Home",
      "9/17 - 8:15 PM EDT",
      "Riding a W1",
    ]);
  });
});
