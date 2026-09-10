import { describe, expect, it } from "vitest";
import {
  buildMorningBriefing,
  clampMorningScore,
  suggestTasksForGaps,
} from "./morning-briefing";

describe("clampMorningScore", () => {
  it("clamps to 1–10 integers", () => {
    expect(clampMorningScore(0)).toBe(1);
    expect(clampMorningScore(11)).toBe(10);
    expect(clampMorningScore(7.4)).toBe(7);
    expect(clampMorningScore(7.6)).toBe(8);
  });
});

describe("buildMorningBriefing", () => {
  it("composes pillars and suggests snoozed work into a gap", () => {
    const briefing = buildMorningBriefing({
      scores: {
        sleepHours: 8,
        sleepQuality: 7,
        mood: 8,
        energy: 7,
        stress: 3,
      },
      weather: {
        label: "Partly cloudy",
        highF: 72,
        lowF: 54,
        precipChancePct: 10,
      },
      events: [
        {
          id: "m1",
          title: "Standup",
          startTime: "9:00 AM",
          endTime: "9:30 AM",
        },
        {
          id: "m2",
          title: "Dinner",
          startTime: "6:30 PM",
          endTime: "7:30 PM",
        },
      ],
      tasks: [
        { id: "t1", label: "Call the bank", snoozedAhead: true },
        { id: "t2", label: "Pack snacks", time: "12:00" },
        { id: "t3", label: "Reply to lease" },
      ],
    });

    expect(briefing.feeling).toMatch(/Sleep looks solid/i);
    expect(briefing.weather).toMatch(/partly cloudy/i);
    expect(briefing.calendar).toMatch(/Standup/);
    expect(briefing.tasks).toMatch(/Call the bank/);
    expect(briefing.freeTime).toMatch(/open|AM|PM/i);
    expect(briefing.suggestions.length).toBeGreaterThan(0);
    expect(briefing.suggestions[0]!.taskLabel).toBe("Call the bank");
    expect(briefing.sections.map((s) => s.key)).toEqual(
      expect.arrayContaining(["you", "weather", "calendar", "tasks", "open", "try"]),
    );
    expect(briefing.paragraphs.length).toBeGreaterThanOrEqual(5);
  });

  it("handles an empty clear day", () => {
    const briefing = buildMorningBriefing({
      scores: {
        sleepHours: 4,
        sleepQuality: 3,
        mood: 3,
        energy: 3,
        stress: 8,
      },
      weather: null,
      events: [],
      tasks: [],
    });
    expect(briefing.feeling).toMatch(/thin|gentle|elevated/i);
    expect(briefing.calendar).toMatch(/clear/i);
    expect(briefing.tasks).toMatch(/nothing open|clear/i);
    expect(briefing.suggestions).toEqual([]);
  });
});

describe("suggestTasksForGaps", () => {
  it("skips tasks that already have a clock time", () => {
    const suggestions = suggestTasksForGaps(
      [
        { id: "a", label: "Timed", time: "10:00" },
        { id: "b", label: "Floating" },
      ],
      [{ startMin: 10 * 60, endMin: 12 * 60, minutes: 120 }],
    );
    expect(suggestions).toEqual([
      {
        taskId: "b",
        taskLabel: "Floating",
        gapLabel: "10 AM–12 PM",
      },
    ]);
  });
});
