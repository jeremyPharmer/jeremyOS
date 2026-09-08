import { describe, expect, it } from "vitest";
import {
  addCustomAgendaEvent,
  customEventsForDay,
  formatAgendaTimeInput,
  mergeAgendaEvents,
  removeCustomAgendaEvent,
  updateCustomAgendaEvent,
} from "./custom-agenda";
import { emptyState } from "./journey";
import type { WorkCalendarEvent } from "./work-calendar";

describe("formatAgendaTimeInput", () => {
  it("formats 24h input to display label", () => {
    expect(formatAgendaTimeInput("15:30")).toMatch(/3:30/);
  });
});

describe("custom agenda events", () => {
  it("adds and lists events for a day", () => {
    let state = emptyState();
    state = addCustomAgendaEvent(state, {
      date: "2026-09-01",
      title: "Pick up Rx",
      startTime: "3:00 PM",
      endTime: "3:15 PM",
      group: "home",
    });
    const events = customEventsForDay(state, "2026-09-01");
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Pick up Rx");
    expect(events[0]?.id.startsWith("custom:")).toBe(true);
  });

  it("updates title", () => {
    let state = addCustomAgendaEvent(emptyState(), {
      date: "2026-09-01",
      title: "Old",
      group: "work",
    });
    const id = customEventsForDay(state, "2026-09-01")[0]!.id;
    state = updateCustomAgendaEvent(state, id, { title: "New title" });
    expect(customEventsForDay(state, "2026-09-01")[0]?.title).toBe("New title");
  });

  it("removes events", () => {
    let state = addCustomAgendaEvent(emptyState(), {
      date: "2026-09-01",
      title: "Temp",
      group: "family",
    });
    const id = customEventsForDay(state, "2026-09-01")[0]!.id;
    state = removeCustomAgendaEvent(state, id);
    expect(customEventsForDay(state, "2026-09-01")).toHaveLength(0);
    expect(state.customAgendaEvents).toBeUndefined();
  });

  it("merges custom events into agenda sort order", () => {
    const feed: WorkCalendarEvent[] = [
      {
        id: "feed:1",
        title: "Standup",
        startTime: "9:00 AM",
        endTime: "9:30 AM",
        source: "work",
      },
    ];
    const merged = mergeAgendaEvents(feed, [
      {
        id: "custom:1",
        date: "2026-09-01",
        title: "Reminder",
        startTime: "2:00 PM",
        createdAt: "2026-09-01T12:00:00.000Z",
      },
    ]);
    expect(merged.map((e) => e.title)).toEqual(["Standup", "Reminder"]);
  });
});
