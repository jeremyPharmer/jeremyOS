import { describe, expect, it } from "vitest";
import {
  clampFiveScore,
  dayAheadProse,
  weatherPeriodPhrases,
} from "./open-day-prose";
import type { DailyForecast } from "./weather";

const sampleDay: DailyForecast = {
  date: "2026-10-07",
  highF: 72,
  lowF: 54,
  code: 1,
  label: "Partly cloudy",
  icon: "⛅",
  precipChancePct: 10,
  precipIn: 0,
  windMphMax: 8,
  uvIndexMax: 5,
};

describe("clampFiveScore", () => {
  it("clamps to 1–5", () => {
    expect(clampFiveScore(0)).toBe(1);
    expect(clampFiveScore(3.4)).toBe(3);
    expect(clampFiveScore(9)).toBe(5);
  });
});

describe("weatherPeriodPhrases", () => {
  it("returns morning afternoon evening lines", () => {
    const w = weatherPeriodPhrases(sampleDay, "Los Angeles");
    expect(w).not.toBeNull();
    expect(w!.morning).toMatch(/54/);
    expect(w!.afternoon).toMatch(/72/);
    expect(w!.evening).toMatch(/54/);
    expect(w!.summary).toMatch(/Partly cloudy/);
  });

  it("returns null without a day", () => {
    expect(weatherPeriodPhrases(null)).toBeNull();
  });
});

describe("dayAheadProse", () => {
  it("describes a clear day", () => {
    const prose = dayAheadProse({ events: [], tasks: [] });
    expect(prose).toMatch(/calendar is clear/i);
    expect(prose).toMatch(/No open tasks/i);
  });

  it("lists timed events and tasks in plain English", () => {
    const prose = dayAheadProse({
      events: [
        {
          title: "Standup",
          startTime: "9:00 AM",
          endTime: "9:30 AM",
        },
        {
          title: "Dinner",
          startTime: "6:30 PM",
          endTime: "7:30 PM",
        },
      ],
      tasks: [{ label: "Call mom" }, { label: "Pack lunch" }],
    });
    expect(prose).toMatch(/2 timed events/i);
    expect(prose).toMatch(/Standup/);
    expect(prose).toMatch(/2 tasks/);
    expect(prose).toMatch(/Call mom/);
  });
});
