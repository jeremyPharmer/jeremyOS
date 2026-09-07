import { describe, expect, it } from "vitest";
import {
  isAgendaEventPast,
  orderAgendaUpcomingThenPast,
  parseAgendaDisplayTimeToMinutes,
} from "./agenda-past";
import {
  normalizeIcalUrl,
  parseIcsEventsForDay,
  resolveCalendarFeedUrls,
  type WorkCalendarEvent,
} from "./work-calendar";

const TZ = "America/Los_Angeles";

describe("normalizeIcalUrl", () => {
  it("converts webcal to https", () => {
    expect(
      normalizeIcalUrl("webcal://p123.icloud.com/published/1/abc"),
    ).toBe("https://p123.icloud.com/published/1/abc");
  });

  it("rejects non-http schemes", () => {
    expect(normalizeIcalUrl("ftp://example.com/cal.ics")).toBeUndefined();
  });

  it("trims empty to undefined", () => {
    expect(normalizeIcalUrl("  ")).toBeUndefined();
  });
});

describe("resolveCalendarFeedUrls", () => {
  it("prefers profile URLs over env", () => {
    expect(
      resolveCalendarFeedUrls(
        {
          personalIcalUrl: "https://icloud.example/personal.ics",
          workIcalUrl: "https://google.example/work.ics",
        },
        "https://env.example/work.ics",
      ),
    ).toEqual({
      personal: "https://icloud.example/personal.ics",
      work: "https://google.example/work.ics",
      extras: [],
    });
  });

  it("falls back to env for work", () => {
    expect(
      resolveCalendarFeedUrls({}, "https://env.example/work.ics"),
    ).toEqual({
      personal: undefined,
      work: "https://env.example/work.ics",
      extras: [],
    });
  });

  it("includes extra iCal URLs and skips duplicates", () => {
    expect(
      resolveCalendarFeedUrls({
        personalIcalUrl: "https://icloud.example/personal.ics",
        extraIcalUrls: [
          "webcal://shared.example/family.ics",
          "https://icloud.example/personal.ics",
          "  ",
          "https://school.example/calendar.ics",
        ],
      }),
    ).toEqual({
      personal: "https://icloud.example/personal.ics",
      work: undefined,
      extras: [
        "https://shared.example/family.ics",
        "https://school.example/calendar.ics",
      ],
    });
  });
});

describe("parseIcsEventsForDay", () => {
  it("parses a timed event on the target day", () => {
    // 2026-09-01 17:00–18:00 UTC = 10:00–11:00 America/Los_Angeles
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:standup-1
DTSTART:20260901T170000Z
DTEND:20260901T180000Z
SUMMARY:Standup
LOCATION:Zoom
END:VEVENT
END:VCALENDAR`;

    const events = parseIcsEventsForDay(ics, "2026-09-01", TZ, "work");
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Standup");
    expect(events[0]?.allDay).toBeFalsy();
    expect(events[0]?.location).toBe("Zoom");
    expect(events[0]?.source).toBe("work");
    expect(events[0]?.startTime).toMatch(/10:00/);
  });

  it("parses an all-day event", () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:offsite-1
DTSTART;VALUE=DATE:20260902
DTEND;VALUE=DATE:20260903
SUMMARY:Offsite
END:VEVENT
END:VCALENDAR`;

    const events = parseIcsEventsForDay(ics, "2026-09-02", TZ, "personal");
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Offsite");
    expect(events[0]?.allDay).toBe(true);
    expect(events[0]?.startTime).toBe("All day");
  });

  it("expands a weekly RRULE onto the matching day", () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:weekly-1
DTSTART:20260901T180000Z
DTEND:20260901T190000Z
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Weekly sync
END:VEVENT
END:VCALENDAR`;

    const week1 = parseIcsEventsForDay(ics, "2026-09-01", TZ, "work");
    const week2 = parseIcsEventsForDay(ics, "2026-09-08", TZ, "work");
    const off = parseIcsEventsForDay(ics, "2026-09-02", TZ, "work");
    expect(week1.map((e) => e.title)).toEqual(["Weekly sync"]);
    expect(week2.map((e) => e.title)).toEqual(["Weekly sync"]);
    expect(off).toHaveLength(0);
  });

  it("skips cancelled events", () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:cancel-1
DTSTART:20260901T200000Z
DTEND:20260901T210000Z
SUMMARY:Cancelled meeting
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

    expect(parseIcsEventsForDay(ics, "2026-09-01", TZ, "work")).toHaveLength(0);
  });
});

describe("agenda past helpers", () => {
  const timed = (partial: Partial<WorkCalendarEvent>): WorkCalendarEvent => ({
    id: partial.id ?? "e1",
    title: partial.title ?? "Event",
    startTime: partial.startTime ?? "9:00 AM",
    endTime: partial.endTime,
    allDay: partial.allDay,
    source: partial.source ?? "personal",
    location: partial.location,
    url: partial.url,
  });

  it("parses AM/PM display times", () => {
    expect(parseAgendaDisplayTimeToMinutes("12:00 AM")).toBe(0);
    expect(parseAgendaDisplayTimeToMinutes("12:00 PM")).toBe(12 * 60);
    expect(parseAgendaDisplayTimeToMinutes("1:15 PM")).toBe(13 * 60 + 15);
    expect(parseAgendaDisplayTimeToMinutes("All day")).toBeNull();
  });

  it("marks timed events past after end on today", () => {
    // 18:30 UTC = 11:30 AM America/Los_Angeles on 2026-09-07
    const now = new Date("2026-09-07T18:30:00Z");
    expect(
      isAgendaEventPast(
        timed({ startTime: "9:00 AM", endTime: "10:00 AM" }),
        "2026-09-07",
        "2026-09-07",
        now,
        TZ,
      ),
    ).toBe(true);
    expect(
      isAgendaEventPast(
        timed({ startTime: "12:00 PM", endTime: "1:15 PM" }),
        "2026-09-07",
        "2026-09-07",
        now,
        TZ,
      ),
    ).toBe(false);
  });

  it("sinks past events below upcoming in one list", () => {
    const now = new Date("2026-09-07T18:30:00Z");
    const ordered = orderAgendaUpcomingThenPast(
      [
        timed({ id: "past", startTime: "8:00 AM", endTime: "9:00 AM", title: "Past" }),
        timed({
          id: "soon",
          startTime: "12:00 PM",
          endTime: "1:15 PM",
          title: "Soon",
        }),
        timed({ id: "mid", startTime: "10:00 AM", endTime: "10:30 AM", title: "Mid" }),
      ],
      "2026-09-07",
      "2026-09-07",
      now,
      TZ,
    );
    expect(ordered.map((e) => e.id)).toEqual(["soon", "past", "mid"]);
  });
});
