import { describe, expect, it } from "vitest";
import {
  scheduledOccurrenceDates,
  taskAdherence,
  trackedTaskAdherenceList,
} from "./task-adherence";
import { applyTodoAction } from "./todos";
import { emptyState } from "./journey";
import type { DayProvision, RebuildState } from "./types";

function stateWith(items: DayProvision[]): RebuildState {
  return { ...emptyState(), dayProvisions: items };
}

describe("scheduledOccurrenceDates", () => {
  it("lists daily days inclusive", () => {
    expect(
      scheduledOccurrenceDates("2026-09-01", "2026-09-03", { kind: "daily" }),
    ).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("lists weekly weekdays only", () => {
    // 2026-09-01 is Tuesday; Mon+Thu → Sep 3, 7, 10
    expect(
      scheduledOccurrenceDates("2026-09-01", "2026-09-10", {
        kind: "weekly",
        weekdays: [1, 4],
      }),
    ).toEqual(["2026-09-03", "2026-09-07", "2026-09-10"]);
  });

  it("lists every N days from the start", () => {
    expect(
      scheduledOccurrenceDates("2026-09-01", "2026-09-10", {
        kind: "every_n_days",
        n: 3,
      }),
    ).toEqual(["2026-09-01", "2026-09-04", "2026-09-07", "2026-09-10"]);
  });
});

describe("taskAdherence", () => {
  it("returns null when track over time is off", () => {
    expect(
      taskAdherence(
        {
          id: "t1",
          date: "2026-09-10",
          label: "Meditate",
          completed: false,
          recurrence: { kind: "daily" },
        },
        "2026-09-10",
      ),
    ).toBeNull();
  });

  it("computes percent from completions vs scheduled since created", () => {
    const row = taskAdherence(
      {
        id: "t1",
        date: "2026-09-10",
        label: "Meditate",
        completed: false,
        recurrence: { kind: "daily" },
        trackOverTime: true,
        createdAt: "2026-09-08T12:00:00.000Z",
        completionDates: ["2026-09-08", "2026-09-10"],
      },
      "2026-09-10",
    );
    // Sep 8,9,10 = 3 expected; 2 done → 67%
    expect(row).toMatchObject({
      completed: 2,
      expected: 3,
      percent: 67,
      createdOn: "2026-09-08",
    });
  });

  it("handles two times a week cadence", () => {
    // Created Monday Sep 7; track Mon+Thu through Sep 11 (Fri)
    // Scheduled: Sep 7 (Mon), Sep 10 (Thu) = 2; completed once → 50%
    const row = taskAdherence(
      {
        id: "t1",
        date: "2026-09-14",
        label: "Gym",
        completed: false,
        recurrence: { kind: "weekly", weekdays: [1, 4] },
        trackOverTime: true,
        createdAt: "2026-09-07T08:00:00.000Z",
        completionDates: ["2026-09-07"],
      },
      "2026-09-11",
    );
    expect(row).toMatchObject({ completed: 1, expected: 2, percent: 50 });
  });
});

describe("trackedTaskAdherenceList + todos logging", () => {
  it("logs completion dates when trackOverTime is on", () => {
    let s = applyTodoAction(
      stateWith([]),
      {
        action: "add",
        group: "home",
        label: "Floss",
        recurrence: { kind: "daily" },
        trackOverTime: true,
      },
      "2026-09-08",
      "2026-09-08T09:00:00.000Z",
    );
    const id = s.dayProvisions![0].id;
    expect(s.dayProvisions![0].trackOverTime).toBe(true);
    expect(s.dayProvisions![0].createdAt).toBe("2026-09-08T09:00:00.000Z");

    s = applyTodoAction(s, { action: "complete", id }, "2026-09-08", "now");
    expect(s.dayProvisions![0].completionDates).toEqual(["2026-09-08"]);

    s = applyTodoAction(s, { action: "undo", id }, "2026-09-08", "now");
    expect(s.dayProvisions![0].completionDates).toBeUndefined();

    s = applyTodoAction(s, { action: "complete", id }, "2026-09-08", "now");
    s = applyTodoAction(s, { action: "complete", id }, "2026-09-09", "now");
    expect(s.dayProvisions![0].completionDates).toEqual([
      "2026-09-08",
      "2026-09-09",
    ]);

    const list = trackedTaskAdherenceList(s, "2026-09-09");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      label: "Floss",
      completed: 2,
      expected: 2,
      percent: 100,
    });
  });

  it("does not log when trackOverTime is off", () => {
    let s = applyTodoAction(
      stateWith([]),
      {
        action: "add",
        group: "home",
        label: "Call mom",
        recurrence: { kind: "daily" },
      },
      "2026-09-08",
      "now",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(s, { action: "complete", id }, "2026-09-08", "now");
    expect(s.dayProvisions![0].completionDates).toBeUndefined();
    expect(trackedTaskAdherenceList(s, "2026-09-08")).toEqual([]);
  });
});
