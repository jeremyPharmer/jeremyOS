import { describe, expect, it } from "vitest";
import {
  dayAbbrev,
  dayLabel,
  timeGreeting,
  weatherCodeMeta,
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

describe("weatherDetailNote", () => {
  it("mentions precip and wind when elevated", () => {
    const note = weatherDetailNote({
      date: "2026-09-12",
      highF: 72,
      lowF: 55,
      code: 61,
      label: "Rain",
      icon: "🌧️",
      precipChancePct: 60,
      precipIn: 0.25,
      windMphMax: 18,
      uvIndexMax: 3,
    });
    expect(note).toMatch(/60%/);
    expect(note).toMatch(/0\.25/);
    expect(note).toMatch(/18 mph/);
  });
});
