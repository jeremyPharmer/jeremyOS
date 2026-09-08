import { describe, expect, it } from "vitest";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  buildDayTimeline,
  formatGapLabel,
  formatTimelineHour,
} from "./agenda-day-timeline";

describe("formatTimelineHour", () => {
  it("formats hour labels", () => {
    expect(formatTimelineHour(8 * 60)).toBe("8 AM");
    expect(formatTimelineHour(12 * 60)).toBe("12 PM");
    expect(formatTimelineHour(13 * 60 + 30)).toBe("1:30 PM");
    expect(formatTimelineHour(21 * 60)).toBe("9 PM");
  });
});

describe("formatGapLabel", () => {
  it("describes open stretches", () => {
    expect(formatGapLabel(0, 30)).toBe("30m open");
    expect(formatGapLabel(0, 60)).toBe("1h open");
    expect(formatGapLabel(0, 150)).toBe("2h 30m open");
  });
});

describe("buildDayTimeline", () => {
  it("collapses a clear day into one open gap 8–9", () => {
    const { allDay, blocks } = buildDayTimeline([]);
    expect(allDay).toEqual([]);
    expect(blocks).toEqual([
      {
        kind: "gap",
        startMin: DAY_START_MINUTES,
        endMin: DAY_END_MINUTES,
        collapsed: true,
      },
    ]);
  });

  it("places all-day separately and collapses long gaps around events", () => {
    const { allDay, blocks } = buildDayTimeline([
      { id: "a", title: "Focus", startTime: "All day", allDay: true },
      {
        id: "b",
        title: "Standup",
        startTime: "10:00 AM",
        endTime: "10:30 AM",
      },
      {
        id: "c",
        title: "Dinner",
        startTime: "6:00 PM",
        endTime: "7:00 PM",
      },
    ]);
    expect(allDay.map((e) => e.id)).toEqual(["a"]);
    expect(blocks[0]).toMatchObject({
      kind: "gap",
      startMin: DAY_START_MINUTES,
      endMin: 10 * 60,
      collapsed: true,
    });
    expect(blocks[1]).toMatchObject({
      kind: "event",
      event: { id: "b" },
    });
    expect(blocks[2]).toMatchObject({
      kind: "gap",
      collapsed: true,
    });
    expect(blocks[3]).toMatchObject({
      kind: "event",
      event: { id: "c" },
    });
    expect(blocks[4]).toMatchObject({
      kind: "gap",
      endMin: DAY_END_MINUTES,
      collapsed: true,
    });
  });

  it("keeps short gaps expanded", () => {
    const { blocks } = buildDayTimeline([
      {
        id: "1",
        title: "A",
        startTime: "9:00 AM",
        endTime: "9:30 AM",
      },
      {
        id: "2",
        title: "B",
        startTime: "9:45 AM",
        endTime: "10:00 AM",
      },
    ]);
    const gap = blocks.find((b) => b.kind === "gap" && b.startMin === 9 * 60 + 30);
    expect(gap).toMatchObject({ collapsed: false, endMin: 9 * 60 + 45 });
  });

  it("clamps events that start before 8am into the window", () => {
    const { blocks } = buildDayTimeline([
      {
        id: "early",
        title: "Early",
        startTime: "7:00 AM",
        endTime: "9:00 AM",
      },
    ]);
    const ev = blocks.find((b) => b.kind === "event");
    expect(ev).toMatchObject({
      kind: "event",
      startMin: DAY_START_MINUTES,
      endMin: 9 * 60,
    });
  });
});
