import { describe, expect, it } from "vitest";
import { addDays } from "./journey";
import {
  applyTodoAction,
  autoRollTodos,
  completeTodo,
  completedTodosForUndo,
  firstDueDate,
  isOpenOn,
  nextDueDate,
  nextFirstOfMonth,
  nextMatchingWeekday,
  openTodosOn,
  parseRecurrence,
  snoozeUntil,
  undoCompleteTodo,
} from "./todos";
import type { DayProvision, RebuildState } from "./types";
import { emptyState } from "./journey";

function item(partial: Partial<DayProvision> & Pick<DayProvision, "date" | "label">): DayProvision {
  return {
    id: partial.id ?? "t1",
    completed: partial.completed ?? false,
    ...partial,
  };
}

describe("parseRecurrence", () => {
  it("defaults to none", () => {
    expect(parseRecurrence(undefined)).toEqual({ kind: "none" });
  });

  it("parses weekly weekdays and rejects empty", () => {
    expect(parseRecurrence({ kind: "weekly", weekdays: [1, 3, 1, 9] })).toEqual({
      kind: "weekly",
      weekdays: [1, 3],
    });
    expect(() => parseRecurrence({ kind: "weekly", weekdays: [] })).toThrow(
      /weekday/,
    );
  });

  it("parses every N days and rejects invalid n", () => {
    expect(parseRecurrence({ kind: "every_n_days", n: 3 })).toEqual({
      kind: "every_n_days",
      n: 3,
    });
    expect(() => parseRecurrence({ kind: "every_n_days", n: 0 })).toThrow(/≥ 1/);
  });
});

describe("nextDueDate", () => {
  it("daily is the next calendar day", () => {
    expect(nextDueDate("2026-08-31", { kind: "daily" })).toBe("2026-09-01");
  });

  it("every N days counts from the completed day", () => {
    expect(nextDueDate("2026-08-31", { kind: "every_n_days", n: 3 })).toBe(
      "2026-09-03",
    );
  });

  it("weekly picks the next chosen weekday after completion", () => {
    // 2026-08-31 is Monday
    expect(
      nextDueDate("2026-08-31", { kind: "weekly", weekdays: [1, 3, 5] }),
    ).toBe("2026-09-02");
    expect(nextDueDate("2026-09-02", { kind: "weekly", weekdays: [1, 3, 5] })).toBe(
      "2026-09-04",
    );
    expect(nextDueDate("2026-09-04", { kind: "weekly", weekdays: [1, 3, 5] })).toBe(
      "2026-09-07",
    );
  });

  it("monthly first is the 1st of the following month", () => {
    expect(nextDueDate("2026-08-01", { kind: "monthly_first" })).toBe("2026-09-01");
    expect(nextDueDate("2026-08-15", { kind: "monthly_first" })).toBe("2026-09-01");
    expect(nextDueDate("2026-12-01", { kind: "monthly_first" })).toBe("2027-01-01");
  });

  it("Google-style repeat: every 2 days", () => {
    expect(
      nextDueDate("2026-08-31", {
        kind: "repeat",
        frequency: "day",
        interval: 2,
        ends: { type: "never" },
      }),
    ).toBe("2026-09-02");
  });

  it("Google-style repeat: weekly Mon/Wed with interval 1", () => {
    // Monday → Wednesday same week
    expect(
      nextDueDate("2026-08-31", {
        kind: "repeat",
        frequency: "week",
        interval: 1,
        weekdays: [1, 3],
        ends: { type: "never" },
      }),
    ).toBe("2026-09-02");
    // Wednesday → Monday next week
    expect(
      nextDueDate("2026-09-02", {
        kind: "repeat",
        frequency: "week",
        interval: 1,
        weekdays: [1, 3],
        ends: { type: "never" },
      }),
    ).toBe("2026-09-07");
  });

  it("Google-style repeat: monthly same date", () => {
    expect(
      nextDueDate("2026-01-31", {
        kind: "repeat",
        frequency: "month",
        interval: 1,
        monthlyOn: "day",
        ends: { type: "never" },
      }),
    ).toBe("2026-02-28");
  });

  it("Google-style repeat: yearly", () => {
    expect(
      nextDueDate("2024-02-29", {
        kind: "repeat",
        frequency: "year",
        interval: 1,
        ends: { type: "never" },
      }),
    ).toBe("2025-02-28");
  });
});

describe("firstDueDate", () => {
  it("uses today for daily / every-n / none", () => {
    expect(firstDueDate("2026-08-31", { kind: "none" })).toBe("2026-08-31");
    expect(firstDueDate("2026-08-31", { kind: "daily" })).toBe("2026-08-31");
    expect(firstDueDate("2026-08-31", { kind: "every_n_days", n: 5 })).toBe(
      "2026-08-31",
    );
  });

  it("weekly uses today when it matches, else the next weekday", () => {
    expect(firstDueDate("2026-08-31", { kind: "weekly", weekdays: [1] })).toBe(
      "2026-08-31",
    );
    expect(firstDueDate("2026-08-31", { kind: "weekly", weekdays: [3] })).toBe(
      "2026-09-02",
    );
  });

  it("monthly first uses today on the 1st, else next 1st", () => {
    expect(firstDueDate("2026-09-01", { kind: "monthly_first" })).toBe("2026-09-01");
    expect(firstDueDate("2026-08-31", { kind: "monthly_first" })).toBe("2026-09-01");
  });
});

describe("nextMatchingWeekday / nextFirstOfMonth", () => {
  it("finds inclusive weekday matches", () => {
    expect(nextMatchingWeekday("2026-08-31", [1], true)).toBe("2026-08-31");
    expect(nextMatchingWeekday("2026-08-31", [2], true)).toBe("2026-09-01");
  });

  it("skips past the 1st when not inclusive of today", () => {
    expect(nextFirstOfMonth("2026-09-01", true)).toBe("2026-09-01");
    expect(nextFirstOfMonth("2026-09-01", false)).toBe("2026-10-01");
  });
});

describe("autoRollTodos", () => {
  it("rolls incomplete past-due items to today", () => {
    const items = [
      item({ id: "open", date: "2026-08-29", label: "Call dentist" }),
      item({
        id: "done",
        date: "2026-08-29",
        label: "Paid rent",
        completed: true,
      }),
      item({ id: "future", date: "2026-09-05", label: "Snoozed" }),
      item({ id: "today", date: "2026-08-31", label: "Already today" }),
    ];
    const rolled = autoRollTodos(items, "2026-08-31");
    expect(rolled.find((t) => t.id === "open")?.date).toBe("2026-08-31");
    expect(rolled.find((t) => t.id === "done")?.date).toBe("2026-08-29");
    expect(rolled.find((t) => t.id === "future")?.date).toBe("2026-09-05");
    expect(rolled.find((t) => t.id === "today")?.date).toBe("2026-08-31");
  });

  it("is a no-op when nothing is overdue", () => {
    const items = [item({ date: "2026-08-31", label: "x" })];
    expect(autoRollTodos(items, "2026-08-31")).toBe(items);
  });
});

describe("snooze", () => {
  it("snooze until tomorrow and a picked date", () => {
    const open = item({ date: "2026-08-31", label: "Email" });
    expect(snoozeUntil(open, addDays("2026-08-31", 1)).date).toBe("2026-09-01");
    expect(snoozeUntil(open, "2026-09-10").date).toBe("2026-09-10");
  });

  it("rejects snoozing a finished one-off", () => {
    expect(() =>
      snoozeUntil(
        item({ date: "2026-08-31", label: "x", completed: true }),
        "2026-09-01",
      ),
    ).toThrow(/finished/);
  });
});

describe("complete + undo recurring", () => {
  it("hides a one-off from today's open list when done", () => {
    const done = completeTodo(
      item({ date: "2026-08-31", label: "Ship" }),
      "2026-08-31",
      "2026-08-31T20:00:00.000Z",
    );
    expect(done.completed).toBe(true);
    expect(isOpenOn(done, "2026-08-31")).toBe(false);
  });

  it("advances a recurring item and hides it until next due", () => {
    const daily = item({
      date: "2026-08-31",
      label: "Meds",
      recurrence: { kind: "daily" },
    });
    const after = completeTodo(daily, "2026-08-31", "now");
    expect(after.completed).toBe(false);
    expect(after.date).toBe("2026-09-01");
    expect(after.lastCompletedOn).toBe("2026-08-31");
    expect(isOpenOn(after, "2026-08-31")).toBe(false);
    expect(isOpenOn(after, "2026-09-01")).toBe(true);
  });

  it("undo restores a recurring item to the completed occurrence", () => {
    const after = completeTodo(
      item({
        date: "2026-08-31",
        label: "Meds",
        recurrence: { kind: "weekly", weekdays: [1] },
      }),
      "2026-08-31",
      "now",
    );
    expect(after.date).toBe("2026-09-07");
    const undone = undoCompleteTodo(after);
    expect(undone.date).toBe("2026-08-31");
    expect(undone.lastCompletedOn).toBeUndefined();
    expect(isOpenOn(undone, "2026-08-31")).toBe(true);
  });
});


describe("repeat ends", () => {
  it("ends after N completions", () => {
    let s = applyTodoAction(
      emptyState(),
      {
        action: "add",
        group: "home",
        label: "Stretch",
        date: "2026-08-31",
        recurrence: {
          kind: "repeat",
          frequency: "day",
          interval: 1,
          ends: { type: "after", count: 2 },
        },
      },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(s, { action: "complete", id }, "2026-08-31", "now");
    expect(s.dayProvisions![0].completed).toBe(false);
    expect(s.dayProvisions![0].date).toBe("2026-09-01");
    s = applyTodoAction(s, { action: "complete", id }, "2026-09-01", "now");
    expect(s.dayProvisions![0].completed).toBe(true);
  });

  it("ends on a date before the next due", () => {
    let s = applyTodoAction(
      emptyState(),
      {
        action: "add",
        group: "home",
        label: "Report",
        date: "2026-08-31",
        recurrence: {
          kind: "repeat",
          frequency: "day",
          interval: 1,
          ends: { type: "on", date: "2026-09-01" },
        },
      },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(s, { action: "complete", id }, "2026-08-31", "now");
    expect(s.dayProvisions![0].completed).toBe(false);
    expect(s.dayProvisions![0].date).toBe("2026-09-01");
    s = applyTodoAction(s, { action: "complete", id }, "2026-09-01", "now");
    expect(s.dayProvisions![0].completed).toBe(true);
  });

  it("stores optional due time", () => {
    const s = applyTodoAction(
      emptyState(),
      {
        action: "add",
        group: "home",
        label: "Call",
        date: "2026-08-31",
        time: "14:30",
        recurrence: { kind: "none" },
      },
      "2026-08-31",
      "now",
    );
    expect(s.dayProvisions![0].time).toBe("14:30");
  });
});

describe("applyTodoAction", () => {
  function stateWith(items: DayProvision[]): RebuildState {
    const s = emptyState();
    s.dayProvisions = items;
    return s;
  }

  it("adds, snoozes tomorrow, and snoozes until a date", () => {
    let s = applyTodoAction(
      stateWith([]),
      { action: "add", group: "home", label: "Groceries" },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    expect(openTodosOn(s.dayProvisions!, "2026-08-31")).toHaveLength(1);

    s = applyTodoAction(
      s,
      { action: "snooze", id, until: "tomorrow" },
      "2026-08-31",
      "now",
    );
    expect(s.dayProvisions![0].date).toBe("2026-09-01");
    expect(openTodosOn(s.dayProvisions!, "2026-08-31")).toHaveLength(0);

    s = applyTodoAction(
      s,
      { action: "snooze", id, until: "2026-09-12" },
      "2026-08-31",
      "now",
    );
    expect(s.dayProvisions![0].date).toBe("2026-09-12");
  });

  it("rejects snooze until today or the past", () => {
    const s = applyTodoAction(
      stateWith([]),
      { action: "add", group: "home", label: "x" },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    expect(() =>
      applyTodoAction(
        s,
        { action: "snooze", id, until: "2026-08-31" },
        "2026-08-31",
        "now",
      ),
    ).toThrow(/future/);
  });

  it("complete + undo round-trips a daily item for the undo panel", () => {
    let s = applyTodoAction(
      stateWith([]),
      { action: "add", group: "home", label: "Walk", recurrence: { kind: "daily" } },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(s, { action: "complete", id }, "2026-08-31", "now");
    expect(completedTodosForUndo(s.dayProvisions!, "2026-08-31")).toHaveLength(1);
    expect(openTodosOn(s.dayProvisions!, "2026-08-31")).toHaveLength(0);
    s = applyTodoAction(s, { action: "undo", id }, "2026-08-31", "now");
    expect(openTodosOn(s.dayProvisions!, "2026-08-31")).toHaveLength(1);
  });

  it("edits label and recurrence, deletes items", () => {
    let s = applyTodoAction(
      stateWith([]),
      { action: "add", group: "home", label: "Draft" },
      "2026-08-31",
      "now",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(
      s,
      {
        action: "edit",
        id,
        label: "Write",
        recurrence: { kind: "every_n_days", n: 2 },
      },
      "2026-08-31",
      "now",
    );
    expect(s.dayProvisions![0].label).toBe("Write");
    expect(s.dayProvisions![0].recurrence).toEqual({
      kind: "every_n_days",
      n: 2,
    });
    s = applyTodoAction(s, { action: "delete", id }, "2026-08-31", "now");
    expect(s.dayProvisions).toEqual([]);
  });

  it("clears No due date when edit sends undated:false and a date", () => {
    let s = applyTodoAction(
      stateWith([]),
      {
        action: "add",
        group: "home",
        label: "Setup BP machine",
        undated: true,
      },
      "2026-09-08",
      "now",
    );
    const id = s.dayProvisions![0].id;
    expect(s.dayProvisions![0].undated).toBe(true);

    s = applyTodoAction(
      s,
      {
        action: "edit",
        id,
        label: "Setup BP machine",
        group: "home",
        date: "2026-09-10",
        undated: false,
        recurrence: { kind: "none" },
      },
      "2026-09-08",
      "now",
    );
    expect(s.dayProvisions![0].undated).toBeUndefined();
    expect(s.dayProvisions![0].date).toBe("2026-09-10");
  });
});
