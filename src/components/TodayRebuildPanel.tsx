"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import { addDays } from "@/lib/journey";
import {
  groupOpenTodos,
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
  type GroupedOpenTodos,
  type TaskGroup,
} from "@/lib/task-groups";
import { openTodosOn } from "@/lib/todos";
import { dayAbbrev } from "@/lib/weather";

function threeDayWindow(start: string): [string, string, string] {
  return [start, addDays(start, 1), addDays(start, 2)];
}

export function TodayRebuildPanel() {
  const { state, dashboard, today, post } = useApp();
  const [viewDate, setViewDate] = useState(today);
  const [windowStart, setWindowStart] = useState(today);
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [todoBusyId, setTodoBusyId] = useState<string | null>(null);
  const [exitingTodos, setExitingTodos] = useState<string[]>([]);

  const onToday = viewDate === today;

  useEffect(() => {
    setViewDate(today);
    setWindowStart(today);
  }, [today]);

  const todos = state.dayProvisions ?? [];
  const openTodos = useMemo(
    () => openTodosOn(todos, viewDate),
    [todos, viewDate],
  );

  const stripDays = useMemo(
    () => threeDayWindow(windowStart),
    [windowStart],
  );

  useEffect(() => {
    if (!stripDays.includes(viewDate)) {
      setViewDate(stripDays[0]);
    }
  }, [stripDays, viewDate]);

  function shiftWindow(deltaDays: number) {
    setWindowStart((start) => {
      const next = addDays(start, deltaDays);
      setViewDate(next);
      return next;
    });
  }
  if (!dashboard || !state.profile) return null;

  // Open/Close live in the Home header (RB-032) — not in Tasks counts.
  const openGroups = groupOpenTodos(openTodos, today);
  const openCount = openTodos.length;
  const todayPersonal = openTodosOn(todos, today).length;
  const todayOpenTotal = viewDate === today ? openCount : todayPersonal;

  const stripCounts = stripDays.map((date) => {
    if (date === today) {
      return { date, count: todayOpenTotal, done: todayOpenTotal === 0 };
    }
    const personal = openTodosOn(todos, date).length;
    return { date, count: personal, done: false };
  });

  async function todoAction(id: string, body: Record<string, unknown>) {
    setTodoBusyId(id);
    try {
      if (body.action === "complete") {
        setExitingTodos((prev) => (prev.includes(id) ? prev : [...prev, id]));
        await new Promise((r) => setTimeout(r, 420));
      }
      await post("/api/todos", body);
    } catch (e) {
      setExitingTodos((prev) => prev.filter((x) => x !== id));
      throw e;
    } finally {
      setTodoBusyId(null);
      setExitingTodos((prev) => prev.filter((x) => x !== id));
    }
  }

  async function addTodo(payload: TodoComposerPayload) {
    setAddBusy(true);
    try {
      await post("/api/todos", {
        action: "add",
        label: payload.label,
        date: payload.date,
        time: payload.time,
        recurrence: payload.recurrence,
        group: payload.group,
        undated: payload.undated,
      });
      setAdding(false);
    } finally {
      setAddBusy(false);
    }
  }

  function renderTodoRow(p: (typeof openTodos)[number]) {
    return (
      <TodoTaskRow
        key={p.id}
        item={p}
        today={today}
        viewDate={viewDate}
        home
        busy={todoBusyId === p.id}
        clearing={exitingTodos.includes(p.id)}
        onComplete={() => todoAction(p.id, { action: "complete", id: p.id })}
        onSnooze={(until) =>
          todoAction(p.id, { action: "snooze", id: p.id, until })
        }
        onEdit={(payload) =>
          todoAction(p.id, {
            action: "edit",
            id: p.id,
            ...payload,
          })
        }
        onDelete={() => todoAction(p.id, { action: "delete", id: p.id })}
      />
    );
  }

  function renderGroup(section: GroupedOpenTodos) {
    const group = section.group as TaskGroup;
    return (
      <div
        key={group}
        className="home-task-group"
        style={{ ["--group-color" as string]: TASK_GROUP_COLORS[group] }}
      >
        <p className="eyebrow task-group-heading home-task-group-heading">
          <span className="task-group-heading-swatch" aria-hidden />
          {TASK_GROUP_LABELS[group]}
        </p>
        {section.dated.map(renderTodoRow)}
        {section.undated.length > 0 ? (
          <>
            <p className="tiny muted task-group-nodate">No date</p>
            {section.undated.map(renderTodoRow)}
          </>
        ) : null}
      </div>
    );
  }

  const showSchedule = openCount > 0 || adding;

  return (
    <section className="home-card home-card-tasks" aria-label="Tasks">
      <header className="agenda-header">
        <div className="agenda-header-top">
          <p className="home-card-kicker">Tasks</p>
          <div className="agenda-header-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Add a task"
              onClick={() => setAdding(true)}
            >
              +
            </button>
          </div>
        </div>

        <div className="tasks-day-strip-nav">
          <button
            type="button"
            className="btn ghost workout-cal-arrow tasks-day-strip-arrow"
            aria-label="Previous three days"
            onClick={() => shiftWindow(-3)}
          >
            ‹
          </button>
          <div
            className="tasks-day-strip"
            role="tablist"
            aria-label="Three-day window"
          >
            {stripCounts.map(({ date, count, done }) => {
              const selected = date === viewDate;
              const label = date === today ? "Today" : dayAbbrev(date);
              const status = done ? "✓" : count === 0 ? "—" : String(count);
              return (
                <button
                  key={date}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`tasks-day-chip${selected ? " selected" : ""}${done ? " done" : ""}`}
                  onClick={() => setViewDate(date)}
                >
                  <span className="tasks-day-chip-label">{label}</span>
                  <span className="tasks-day-chip-status" aria-hidden>
                    {status}
                  </span>
                  <span className="sr-only">
                    {done
                      ? "complete"
                      : count === 0
                        ? "nothing scheduled"
                        : `${count} open`}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn ghost workout-cal-arrow tasks-day-strip-arrow"
            aria-label="Next three days"
            onClick={() => shiftWindow(3)}
          >
            ›
          </button>
        </div>
      </header>
      {adding && (
        <TodoComposer
          today={today}
          defaultDate={viewDate}
          busy={addBusy}
          onSubmit={addTodo}
          onCancel={() => setAdding(false)}
        />
      )}

      {showSchedule ? (
        <div className="tasks-schedule">
          {openGroups.map(renderGroup)}
        </div>
      ) : onToday ? (
        <div className="tasks-complete" aria-label="All tasks complete" />
      ) : (
        <p className="muted agenda-status">
          Nothing scheduled — tap + to add a task.
        </p>
      )}

      <Link href="/items" className="btn ghost workout-open-link">
        Open tasks →
      </Link>
    </section>
  );
}
