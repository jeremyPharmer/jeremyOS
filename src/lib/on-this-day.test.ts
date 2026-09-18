import { describe, expect, it } from "vitest";
import { pickOnThisDayEvent, stablePickIndex } from "./on-this-day";

describe("stablePickIndex", () => {
  it("is stable for the same seed", () => {
    expect(stablePickIndex("2026-09-18", 7)).toBe(
      stablePickIndex("2026-09-18", 7),
    );
  });

  it("stays in range", () => {
    expect(stablePickIndex("2026-01-01", 5)).toBeGreaterThanOrEqual(0);
    expect(stablePickIndex("2026-01-01", 5)).toBeLessThan(5);
  });
});

describe("pickOnThisDayEvent", () => {
  it("picks one concise anniversary", () => {
    const picked = pickOnThisDayEvent(
      [
        { year: 1810, text: "Short." },
        {
          year: 1851,
          text: "The New York Times published its first issue in New York City.",
          pages: [
            {
              content_urls: {
                desktop: { page: "https://en.wikipedia.org/wiki/The_New_York_Times" },
              },
            },
          ],
        },
        {
          year: 1977,
          text: "Voyager I takes the first space photograph of the Earth and the Moon together.",
        },
      ],
      "2026-09-18",
    );
    expect(picked).not.toBeNull();
    expect(picked!.year).toBeGreaterThan(1000);
    expect(picked!.text.length).toBeGreaterThan(20);
  });

  it("prefers lighter copy when available", () => {
    const picked = pickOnThisDayEvent(
      [
        {
          year: 1981,
          text: "A serial killer murdered an antiques dealer in Brussels.",
        },
        {
          year: 1879,
          text: "The Blackpool Illuminations in the English seaside town of Blackpool were switched on for the first time.",
        },
      ],
      "2026-09-18",
    );
    expect(picked?.year).toBe(1879);
    expect(picked?.text).toMatch(/Blackpool/i);
  });
});
