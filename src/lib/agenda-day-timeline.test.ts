import { describe, expect, it } from "vitest";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  assignOverlapColumns,
  buildDayTimeline,
  formatCompactRange,
  formatGapLabel,
  formatTimelineHour,
  laneDensity,
  minutesToTimeInput,
  packTimedBlocks,
  suggestGapEventTimes,
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

describe("minutesToTimeInput / suggestGapEventTimes", () => {
  it("formats HH:MM for time inputs", () => {
    expect(minutesToTimeInput(9 * 60 + 30)).toBe("09:30");
    expect(minutesToTimeInput(13 * 60)).toBe("13:00");
  });

  it("prefills a 30m block inside a long open gap", () => {
    expect(suggestGapEventTimes(9 * 60 + 30, 13 * 60)).toEqual({
      startTime: "09:30",
      endTime: "10:00",
    });
  });

  it("uses the full gap when shorter than 30m", () => {
    expect(suggestGapEventTimes(9 * 60 + 30, 9 * 60 + 45)).toEqual({
      startTime: "09:30",
      endTime: "09:45",
    });
  });
});

describe("assignOverlapColumns / packTimedBlocks", () => {
  it("places non-overlapping events in one column", () => {
    const lanes = assignOverlapColumns([
      {
        event: { id: "a", title: "A", startTime: "9:00 AM" },
        startMin: 9 * 60,
        endMin: 10 * 60,
      },
      {
        event: { id: "b", title: "B", startTime: "10:00 AM" },
        startMin: 10 * 60,
        endMin: 11 * 60,
      },
    ]);
    expect(lanes.map((l) => l.column)).toEqual([0, 0]);
    expect(lanes[0]!.columns).toBe(1);
  });

  it("packs overlapping family afternoon into side-by-side columns", () => {
    const packed = packTimedBlocks([
      {
        event: { id: "landon", title: "Landon practice", startTime: "3:30 PM" },
        startMin: 15 * 60 + 30,
        endMin: 17 * 60 + 30,
      },
      {
        event: { id: "rachel", title: "Rachael : Jeremy", startTime: "4:00 PM" },
        startMin: 16 * 60,
        endMin: 16 * 60 + 30,
      },
      {
        event: { id: "caleb", title: "Caleb practice", startTime: "4:15 PM" },
        startMin: 16 * 60 + 15,
        endMin: 17 * 60 + 45,
      },
      {
        event: { id: "busy", title: "busy", startTime: "4:30 PM" },
        startMin: 16 * 60 + 30,
        endMin: 17 * 60 + 30,
      },
    ]);
    expect(packed).toHaveLength(1);
    expect(packed[0]).toMatchObject({ kind: "cluster" });
    if (packed[0]!.kind !== "cluster") return;
    expect(packed[0].lanes).toHaveLength(4);
    expect(packed[0].lanes[0]!.columns).toBeGreaterThanOrEqual(3);
    const landon = packed[0].lanes.find((l) => l.event.id === "landon")!;
    const rachel = packed[0].lanes.find((l) => l.event.id === "rachel")!;
    expect(landon.column).not.toBe(rachel.column);
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
    const gap = blocks.find(
      (b) => b.kind === "gap" && b.startMin === 9 * 60 + 30,
    );
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

  it("emits a cluster for overlapping afternoon events", () => {
    const { blocks } = buildDayTimeline([
      {
        id: "e1",
        title: "E1 Rearrangement",
        startTime: "2:00 PM",
        endTime: "2:30 PM",
      },
      {
        id: "landon",
        title: "Landon practice",
        startTime: "3:30 PM",
        endTime: "5:30 PM",
      },
      {
        id: "rachel",
        title: "Rachael : Jeremy",
        startTime: "4:00 PM",
        endTime: "4:30 PM",
      },
      {
        id: "caleb",
        title: "Caleb practice",
        startTime: "4:15 PM",
        endTime: "5:45 PM",
      },
      {
        id: "busy",
        title: "busy",
        startTime: "4:30 PM",
        endTime: "5:30 PM",
      },
    ]);
    const cluster = blocks.find((b) => b.kind === "cluster");
    expect(cluster).toMatchObject({ kind: "cluster" });
    if (cluster?.kind !== "cluster") return;
    expect(cluster.lanes.map((l) => l.event.id)).toEqual([
      "landon",
      "rachel",
      "caleb",
      "busy",
    ]);
  });
});

describe("laneDensity", () => {
  it("keeps time-only when a short narrow slot cannot fit a title", () => {
    expect(laneDensity(44, 3)).toBe("time");
  });

  it("adds title when there is room", () => {
    expect(laneDensity(90, 2)).toBe("time-title");
  });
});

describe("formatCompactRange", () => {
  it("shortens a same-meridiem range", () => {
    expect(formatCompactRange(15 * 60 + 30, 17 * 60 + 30)).toBe("3:30–5:30p");
  });

  it("keeps both meridiems when they differ", () => {
    expect(formatCompactRange(11 * 60 + 30, 12 * 60 + 30)).toBe("11:30a–12:30p");
  });
});
