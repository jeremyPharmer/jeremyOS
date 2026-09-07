import { describe, expect, it } from "vitest";
import {
  SUMMARY_SENTENCE_SOFT_LIMIT,
  applyJournalProseEdit,
  bundleJournalsByDate,
  countSentences,
  fiveYearSlots,
  formatMonthDayLong,
  formatWeekdayAbbrev,
  isStarredDay,
  monthDayKey,
  shiftMonthDay,
  toggleStarredDay,
  type DayKey,
} from "./journal";
import { emptyState } from "./journey";
import type { JournalEntry } from "./types";

function entry(
  partial: Pick<JournalEntry, "date" | "type" | "text"> & {
    id?: string;
    photoId?: string;
  },
): JournalEntry {
  return {
    id: partial.id ?? `${partial.date}-${partial.type}`,
    date: partial.date,
    type: partial.type,
    text: partial.text,
    photoId: partial.photoId,
    createdAt: "2026-08-29T12:00:00.000Z",
  };
}

describe("journal five-year helpers", () => {
  it("extracts month-day keys", () => {
    expect(monthDayKey("2026-08-29")).toBe("08-29");
  });

  it("formats long month-day labels", () => {
    expect(formatMonthDayLong("08-29")).toBe("August 29");
    expect(formatMonthDayLong("2024-01-03")).toBe("January 3");
  });

  it("formats weekday abbreviations", () => {
    expect(formatWeekdayAbbrev("2026-08-29")).toBe("Sat");
    expect(formatWeekdayAbbrev("2026-08-31")).toBe("Mon");
  });

  it("counts sentences softly", () => {
    expect(countSentences("")).toBe(0);
    expect(countSentences("One line")).toBe(1);
    expect(countSentences("One. Two. Three.")).toBe(3);
    expect(SUMMARY_SENTENCE_SOFT_LIMIT).toBe(5);
  });

  it("bundles one_line as headline and journal as summary", () => {
    const map = bundleJournalsByDate([
      entry({ date: "2026-08-29", type: "one_line", text: "Quiet morning" }),
      entry({
        date: "2026-08-29",
        type: "journal",
        text: "Walked the dog. Coffee on the porch.",
      }),
      entry({ date: "2025-08-29", type: "one_line", text: "Last year" }),
    ]);
    expect(map.get("2026-08-29")).toEqual({
      date: "2026-08-29",
      headline: "Quiet morning",
      summary: "Walked the dog. Coffee on the porch.",
    });
    expect(map.get("2025-08-29")?.headline).toBe("Last year");
  });

  it("carries photoId onto the day bundle and five-year slot", () => {
    const map = bundleJournalsByDate([
      entry({
        date: "2026-08-29",
        type: "one_line",
        text: "With pic",
        photoId: "photo_abc.jpg",
      }),
      entry({
        date: "2026-08-29",
        type: "journal",
        text: "Note",
        photoId: "photo_abc.jpg",
      }),
    ]);
    expect(map.get("2026-08-29")?.photoId).toBe("photo_abc.jpg");
    const slots = fiveYearSlots("08-29" as DayKey, map, 2026, 1);
    expect(slots[0].photoId).toBe("photo_abc.jpg");
  });

  it("builds year slots backward from anchor with blanks", () => {
    const byDate = bundleJournalsByDate([
      entry({ date: "2026-08-29", type: "one_line", text: "This year" }),
      entry({ date: "2024-08-29", type: "one_line", text: "Two years back" }),
    ]);
    const slots = fiveYearSlots("08-29" as DayKey, byDate, 2026, 4);
    expect(slots.map((s) => s.year)).toEqual([2026, 2025, 2024, 2023]);
    expect(slots[0].headline).toBe("This year");
    expect(slots[1].headline).toBeUndefined();
    expect(slots[2].headline).toBe("Two years back");
  });

  it("uses Feb 28 for Feb 29 in non-leap years", () => {
    const slots = fiveYearSlots("02-29" as DayKey, new Map(), 2028, 2);
    expect(slots.map((s) => s.date)).toEqual(["2028-02-29", "2027-02-28"]);
  });

  it("shifts month-day across month boundaries", () => {
    expect(shiftMonthDay("08-29" as DayKey, 1, 2026)).toBe("08-30");
    expect(shiftMonthDay("08-01" as DayKey, -1, 2026)).toBe("07-31");
  });
});

describe("journal edit + star helpers", () => {
  it("toggles starred days without cap", () => {
    expect(toggleStarredDay(undefined, "2026-08-29")).toEqual(["2026-08-29"]);
    expect(toggleStarredDay(["2026-08-29"], "2026-08-29")).toEqual([]);
    expect(toggleStarredDay(["2026-08-01"], "2026-08-29")).toEqual([
      "2026-08-01",
      "2026-08-29",
    ]);
    expect(isStarredDay(["2026-08-29"], "2026-08-29")).toBe(true);
    expect(isStarredDay([], "2026-08-29")).toBe(false);
  });

  it("edits evening prose and journal rows without side-effect fields", () => {
    const state = emptyState();
    state.evenings = [
      {
        date: "2026-08-29",
        mood: 7,
        stress: 3,
        alignment: "aligned",
        oneLine: "Old headline",
        expandedJournal: "Old summary.",
        completedAt: "2026-08-29T20:00:00.000Z",
      },
    ];
    state.journals = [
      entry({ date: "2026-08-29", type: "one_line", text: "Old headline" }),
      entry({ date: "2026-08-29", type: "journal", text: "Old summary." }),
    ];
    state.reclaimDays = [
      { date: "2026-08-29", estimatedAmount: 40, accounted: false },
    ];

    const next = applyJournalProseEdit(
      state,
      "2026-08-29",
      "New headline",
      "New summary. Still soft.",
    );

    expect(next.evenings[0].oneLine).toBe("New headline");
    expect(next.evenings[0].expandedJournal).toBe("New summary. Still soft.");
    expect(next.evenings[0].mood).toBe(7);
    expect(next.reclaimDays).toEqual(state.reclaimDays);
    expect(bundleJournalsByDate(next.journals).get("2026-08-29")).toEqual({
      date: "2026-08-29",
      headline: "New headline",
      summary: "New summary. Still soft.",
    });
  });

  it("attaches photo id on edit and clears empty summary row", () => {
    const state = emptyState();
    state.evenings = [
      {
        date: "2026-08-30",
        mood: 6,
        alignment: "aligned",
        oneLine: "Hi",
        expandedJournal: "Bye.",
        completedAt: "2026-08-30T20:00:00.000Z",
      },
    ];
    state.journals = [
      entry({ date: "2026-08-30", type: "one_line", text: "Hi" }),
      entry({ date: "2026-08-30", type: "journal", text: "Bye." }),
    ];

    const next = applyJournalProseEdit(
      state,
      "2026-08-30",
      "Hi again",
      "   ",
      "photo_new.jpg",
    );
    expect(next.evenings[0].expandedJournal).toBeUndefined();
    expect(next.journals).toHaveLength(1);
    expect(next.journals[0].text).toBe("Hi again");
    expect(next.journals[0].photoId).toBe("photo_new.jpg");
  });

  it("creates journal-only entry when evening is missing (manual backfill)", () => {
    const state = emptyState();
    const next = applyJournalProseEdit(
      state,
      "2023-08-29",
      "From the paper journal",
      "Hand-entered summary.",
    );
    expect(next.evenings).toHaveLength(0);
    expect(bundleJournalsByDate(next.journals).get("2023-08-29")).toEqual({
      date: "2023-08-29",
      headline: "From the paper journal",
      summary: "Hand-entered summary.",
    });
  });

  it("upserts a prior manual journal day instead of stacking duplicate rows", () => {
    const state = emptyState();
    state.journals = [
      entry({ date: "2026-09-06", type: "one_line", text: "Golf with the guys" }),
      entry({
        date: "2026-09-06",
        type: "journal",
        text: "Great day on the course.",
      }),
    ];

    // Simulate evening close after a manual journal write: evening exists,
    // then prose upsert must update the same rows (not append).
    state.evenings = [
      {
        date: "2026-09-06",
        mood: 7,
        stress: 3,
        alignment: "aligned",
        oneLine: "Golf with the guys",
        expandedJournal: "Great day on the course. Kept the same story.",
        completedAt: "2026-09-06T20:00:00.000Z",
      },
    ];

    const next = applyJournalProseEdit(
      state,
      "2026-09-06",
      "Golf with the guys",
      "Great day on the course. Kept the same story.",
    );

    expect(next.journals.filter((j) => j.date === "2026-09-06")).toHaveLength(2);
    expect(bundleJournalsByDate(next.journals).get("2026-09-06")).toEqual({
      date: "2026-09-06",
      headline: "Golf with the guys",
      summary: "Great day on the course. Kept the same story.",
    });
  });
});
