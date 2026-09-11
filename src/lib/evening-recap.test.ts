import { describe, expect, it } from "vitest";
import { buildEveningRecap } from "./evening-recap";

describe("buildEveningRecap", () => {
  it("composes a day recap with intention, calendar, tasks, and journal", () => {
    const recap = buildEveningRecap({
      scores: { mood: 8, stress: 3 },
      intention: "Ship the evening close",
      headline: "Quiet win",
      summary: "Closed the day with a clean recap.",
      events: [
        {
          id: "e1",
          title: "1:1",
          startTime: "2:00 PM",
          endTime: "2:30 PM",
        },
      ],
      tasks: [
        { id: "t1", label: "Write tests", done: true },
        { id: "t2", label: "Reply to lease", done: false },
      ],
    });

    expect(recap.summary).toMatch(/Mood landed high/i);
    expect(recap.summary).toMatch(/Ship the evening close/);
    expect(recap.summary).toMatch(/Quiet win/);
    expect(recap.sections.map((s) => s.key)).toEqual(
      expect.arrayContaining([
        "you",
        "intention",
        "calendar",
        "tasks",
        "journal",
      ]),
    );
    const tasks = recap.sections.find((s) => s.key === "tasks");
    expect(tasks?.items?.some((i) => i.includes("Write tests"))).toBe(true);
    expect(tasks?.items?.some((i) => i.includes("Still open"))).toBe(true);
  });

  it("handles a sparse day without inventing journal copy", () => {
    const recap = buildEveningRecap({
      scores: { mood: 4, stress: 7 },
      headline: "",
      events: [],
      tasks: [],
    });
    expect(recap.summary).toMatch(/mixed|elevated/i);
    expect(recap.sections.map((s) => s.key)).toEqual([
      "you",
      "calendar",
      "tasks",
    ]);
    expect(recap.sections.find((s) => s.key === "journal")).toBeUndefined();
  });
});
