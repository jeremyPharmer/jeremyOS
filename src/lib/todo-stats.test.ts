import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import { applyTodoAction } from "./todos";
import { recentMonthKeys, todoAnalytics } from "./todo-stats";
import type { RebuildState, TodoEvent } from "./types";

function withEvents(events: TodoEvent[]): RebuildState {
  return { ...emptyState(), todoEvents: events, dayProvisions: [] };
}

describe("recentMonthKeys", () => {
  it("ends on today month and walks back", () => {
    expect(recentMonthKeys("2026-09-24", 3)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });
});

describe("todoAnalytics", () => {
  it("computes snooze percent and group mix", () => {
    const state = withEvents([
      {
        id: "1",
        at: "a",
        date: "2026-09-01",
        todoId: "t1",
        label: "Meditate",
        group: "home",
        action: "complete",
      },
      {
        id: "2",
        at: "b",
        date: "2026-09-02",
        todoId: "t2",
        label: "Call",
        group: "family",
        action: "snooze",
      },
      {
        id: "3",
        at: "c",
        date: "2026-09-03",
        todoId: "t3",
        label: "Listing",
        group: "real_estate",
        action: "complete",
      },
      {
        id: "4",
        at: "d",
        date: "2026-08-10",
        todoId: "t4",
        label: "Ship",
        group: "work",
        action: "complete",
      },
    ]);
    const stats = todoAnalytics(state, "2026-09-24", { monthCount: 3 });
    expect(stats.completes).toBe(3);
    expect(stats.snoozes).toBe(1);
    expect(stats.snoozePercent).toBe(25);
    expect(stats.monthlyCompletes.map((m) => m.count)).toEqual([0, 1, 2]);
    const home = stats.byGroup.find((g) => g.group === "home")!;
    expect(home.completed).toBe(1);
    expect(home.percent).toBe(33);
    expect(stats.history[0]?.id).toBe("4");
  });

  it("returns null snooze percent with no decisions", () => {
    expect(todoAnalytics(emptyState(), "2026-09-24").snoozePercent).toBeNull();
  });
});

describe("applyTodoAction logs events", () => {
  it("logs complete and snooze", () => {
    let s = applyTodoAction(
      emptyState(),
      {
        action: "add",
        group: "home",
        label: "Floss",
        recurrence: { kind: "daily" },
      },
      "2026-09-24",
      "2026-09-24T10:00:00.000Z",
    );
    const id = s.dayProvisions![0].id;
    s = applyTodoAction(s, { action: "complete", id }, "2026-09-24", "now1");
    expect(s.todoEvents).toHaveLength(1);
    expect(s.todoEvents![0]).toMatchObject({
      action: "complete",
      label: "Floss",
      group: "home",
    });
    s = applyTodoAction(
      s,
      { action: "snooze", id, until: "2026-09-25" },
      "2026-09-24",
      "now2",
    );
    expect(s.todoEvents!.map((e) => e.action)).toEqual(["complete", "snooze"]);
  });
});
