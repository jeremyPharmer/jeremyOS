import { describe, expect, it } from "vitest";
import {
  dayAbbrev,
  dayLabel,
  timeGreeting,
  weatherCodeMeta,
  weatherDayFacts,
  weatherDetailNote,
} from "./weather";

describe("weatherCodeMeta", () => {
  it("maps clear and rain codes", () => {
    expect(weatherCodeMeta(0).icon).toBe("☀️");
    expect(weatherCodeMeta(61).label).toBe("Rain");
    expect(weatherCodeMeta(95).icon).toBe("⛈️");
  });
});

describe("dayAbbrev", () => {
  it("returns uppercase weekday abbrev", () => {
    expect(dayAbbrev("2026-08-30")).toMatch(/^[A-Z]{3}$/);
  });
});

describe("dayLabel", () => {
  it("labels today vs other days", () => {
    expect(dayLabel("2026-08-30", "2026-08-30")).toBe("Today");
    expect(dayLabel("2026-08-31", "2026-08-30")).toMatch(
      /Mon|Tue|Wed|Thu|Fri|Sat|Sun/,
    );
  });
});

describe("timeGreeting", () => {
  it("returns afternoon for mid-day UTC on east coast morning", () => {
    const noonUtc = new Date("2026-08-30T16:00:00Z");
    expect(timeGreeting("America/New_York", noonUtc)).toBe("Good afternoon");
  });
});

describe("weatherDayFacts", () => {
  it("returns structured today facts including rain and UV", () => {
    const facts = weatherDayFacts({
      date: "2026-09-20",
      highF: 83,
      lowF: 65,
      code: 2,
      label: "Partly cloudy",
      icon: "⛅",
      precipChancePct: 2,
      precipIn: 0,
      windMphMax: 11,
      uvIndexMax: 7,
    });
    expect(facts.map((f) => f.label)).toEqual([
      "High",
      "Low",
      "Rain",
      "Wind",
      "UV",
    ]);
    expect(facts.find((f) => f.label === "Rain")?.value).toMatch(/2%/);
  });
});
