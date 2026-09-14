import { describe, expect, it } from "vitest";
import {
  formatStreak,
  mapEspnEvent,
  pickFeaturedGame,
  scheduleWhenLabel,
  selectScheduleWindow,
  weekdayAbbrev,
  weekShortLabel,
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
    expect(selectScheduleWindow(games, 3).map((g) => g.id)).toEqual([
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("returns the full list when upcomingCount is Infinity", () => {
    const games = [
      game({ id: "1", date: "2026-09-13", status: "post" }),
      game({ id: "2", date: "2026-09-18", status: "pre" }),
      game({ id: "3", date: "2026-09-27", status: "pre" }),
    ];
    expect(selectScheduleWindow(games).map((g) => g.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});

describe("pickFeaturedGame", () => {
  it("prefers live, then next kickoff", () => {
    expect(
      pickFeaturedGame([
        game({ id: "1", date: "2026-09-13", status: "post" }),
        game({ id: "2", date: "2026-09-18", status: "pre" }),
      ])?.id,
    ).toBe("2");
    expect(
      pickFeaturedGame([
        game({ id: "1", date: "2026-09-13", status: "post" }),
        game({ id: "2", date: "2026-09-18", status: "in" }),
      ])?.id,
    ).toBe("2");
  });
});

describe("weekdayAbbrev + scheduleWhenLabel", () => {
  it("uses a 3-letter weekday for upcoming games", () => {
    const next = game({
      id: "2",
      date: "2026-09-18T00:15:00.000Z",
      status: "pre",
      weekLabel: "Week 2",
      opponentAbbr: "DET",
      homeAway: "home",
    });
    expect(weekdayAbbrev(next.date)).toBe("Thu");
    expect(scheduleWhenLabel(next)).toMatch(/^Thu · /);
    expect(weekShortLabel("Week 2")).toBe("Wk 2");
  });

  it("shows final score for completed games", () => {
    const done = game({
      id: "1",
      date: "2026-09-13T17:00:00.000Z",
      status: "post",
      billsScore: "36",
      opponentScore: "31",
      billsWon: true,
    });
    expect(scheduleWhenLabel(done)).toBe("W 36–31");
  });
});
