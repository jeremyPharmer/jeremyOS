import { describe, expect, it } from "vitest";
import {
  doneDateLabel,
  formatMonthDay,
  formatMonthDayYear,
  groupCompletedTodos,
  groupOpenTodos,
  resolveEventGroup,
} from "./task-groups";
import type { DayProvision } from "./types";

function todo(
  partial: Partial<DayProvision> & Pick<DayProvision, "id" | "label">,
): DayProvision {
  return {
    date: "2026-09-08",
    completed: false,
    ...partial,
  };
}

describe("formatMonthDay", () => {
  it("formats without leading zeros", () => {
    expect(formatMonthDay("2026-09-07")).toBe("9/7");
    expect(formatMonthDay("2026-12-25")).toBe("12/25");
  });
});

describe("formatMonthDayYear", () => {
  it("formats M/D/YY", () => {
    expect(formatMonthDayYear("2026-09-08")).toBe("9/8/26");
    expect(formatMonthDayYear("2026-09-08T15:30:00.000Z")).toBe("9/8/26");
  });
});

describe("groupOpenTodos", () => {
  it("orders groups and buckets undated", () => {
    const items = [
      todo({ id: "1", label: "B", group: "work", date: "2026-09-10" }),
      todo({ id: "2", label: "A", group: "work", date: "2026-09-09" }),
      todo({ id: "3", label: "Call", group: "work", undated: true }),
      todo({ id: "4", label: "Listing", group: "real_estate", date: "2026-09-08" }),
      todo({ id: "5", label: "Done", group: "family", completed: true }),
    ];
    const grouped = groupOpenTodos(items);
    expect(grouped.map((g) => g.group)).toEqual(["real_estate", "work"]);
    expect(grouped[1].dated.map((t) => t.id)).toEqual(["2", "1"]);
    expect(grouped[1].undated.map((t) => t.id)).toEqual(["3"]);
  });

  it("hides empty groups", () => {
    const grouped = groupOpenTodos([
      todo({ id: "1", label: "X", group: "home" }),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].group).toBe("home");
  });
});

describe("groupCompletedTodos", () => {
  it("keeps completed under groups", () => {
    const grouped = groupCompletedTodos([
      todo({
        id: "1",
        label: "X",
        group: "family",
        completed: true,
        completedAt: "2026-09-08T12:00:00.000Z",
      }),
    ]);
    expect(grouped[0].group).toBe("family");
    expect(doneDateLabel(grouped[0].items[0])).toBe("9/8/26");
  });
});

describe("resolveEventGroup", () => {
  it("prefers override, then custom, then feed default", () => {
    expect(
      resolveEventGroup({
        eventId: "e1",
        source: "personal",
        overrides: { e1: "family" },
        feedGroups: { personal: "home" },
        customGroup: "work",
      }),
    ).toBe("family");
    expect(
      resolveEventGroup({
        eventId: "e2",
        source: "custom",
        overrides: {},
        customGroup: "work",
        feedGroups: { personal: "home" },
      }),
    ).toBe("work");
    expect(
      resolveEventGroup({
        eventId: "e3",
        source: "extra",
        extraIndex: 1,
        overrides: {},
        feedGroups: { extra: [undefined, "real_estate"] },
      }),
    ).toBe("real_estate");
  });
});
