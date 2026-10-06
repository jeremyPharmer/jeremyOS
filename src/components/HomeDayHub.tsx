"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import { TaskMonthCalendar } from "@/components/TaskMonthCalendar";
import { TodayAgendaCard } from "@/components/TodayAgendaCard";
import { WorkoutCalendar } from "@/components/workouts/WorkoutCalendar";
import { WorkoutSessionDetail } from "@/components/workouts/WorkoutSessionDetail";
import { formatDisplayDate, parseDate } from "@/lib/journey";
import {
  openDatedTodosOn,
  openTaskColorsByDate,
  openUndatedTodos,
} from "@/lib/task-groups";
import {
  formatWorkoutListDate,
  monthKey,
  parseMonthKey,
  workoutsForDate,
} from "@/lib/workouts";

export type HomeDayMode = "tasks" | "workout" | "calendar";

const HOME_DAY_MODE_KEY = "jeremyos-home-day-mode";

const MODES: { id: HomeDayMode; label: string }[] = [
  { id: "workout", label: "Workout" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
];

function isHomeDayMode(value: string): value is HomeDayMode {
  return value === "tasks" || value === "workout" || value === "calendar";
}

function monthBounds(key: string): { from: string; to: string } {
  const { year, month } = parseMonthKey(key);
  const last = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(last)}`,
  };
}

export function HomeDayHub() {
  const { state, today, post } = useApp();
  const [mode, setModeState] = useState<HomeDayMode>("tasks");
  const [modeReady, setModeReady] = useState(false);

  const initialMonth = useMemo(() => {
    if (!today) return "";
    const d = parseDate(today);
    return monthKey(d.getFullYear(), d.getMonth() + 1);
  }, [today]);

  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exitingTodos, setExitingTodos] = useState<
    Record<string, "complete" | "snooze">
  >({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HOME_DAY_MODE_KEY);
      if (stored && isHomeDayMode(stored)) setModeState(stored);
    } catch {
      /* ignore */
    }
    setModeReady(true);
  }, []);

  useEffect(() => {
    if (!today) return;
    setSelectedDate((prev) => prev || today);
    if (!month) {
      const d = parseDate(today);
      setMonth(monthKey(d.getFullYear(), d.getMonth() + 1));
    }
  }, [today, month]);

  function setMode(next: HomeDayMode) {
    setModeState(next);
    try {
      localStorage.setItem(HOME_DAY_MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    const d = parseDate(date);
    setMonth(monthKey(d.getFullYear(), d.getMonth() + 1));
  }

  const todos = state.dayProvisions ?? [];
  const monthRange = useMemo(
    () => (month ? monthBounds(month) : null),
    [month],
  );
  const dayColors = useMemo(
    () => openTaskColorsByDate(todos, monthRange ?? undefined),
    [todos, monthRange],
  );
  const dayTodos = useMemo(
    () => (selectedDate ? openDatedTodosOn(todos, selectedDate) : []),
    [todos, selectedDate],
  );
  const undatedTodos = useMemo(() => openUndatedTodos(todos), [todos]);
  const showUndated = selectedDate === today && undatedTodos.length > 0;
  const dayWorkouts = useMemo(
    () => (selectedDate ? workoutsForDate(state.workouts, selectedDate) : []),
    [state.workouts, selectedDate],
  );

  function renderTodoRow(
    item: (typeof todos)[number],
    opts?: { undated?: boolean },
  ) {
    // Future calendar days past today are a preview of the recurrence —
    // complete/snooze still run against real "today" on the server.
    const previewOnly = Boolean(
      selectedDate && today && selectedDate > today,
    );
    return (
      <TodoTaskRow
        key={item.id}
        item={item}
        today={today}
        viewDate={selectedDate}
        home
        busy={busyId === item.id}
        clearing={exitingTodos[item.id] === "complete"}
        snoozingOut={exitingTodos[item.id] === "snooze"}
        preview={previewOnly}
        onComplete={() =>
          previewOnly
            ? undefined
            : runTodo(item.id, { action: "complete", id: item.id })
        }
        onSnooze={(until) =>
          previewOnly || opts?.undated
            ? undefined
            : runTodo(item.id, {
                action: "snooze",
                id: item.id,
                until,
              })
        }
        onEdit={(payload) =>
          runTodo(item.id, {
            action: "edit",
            id: item.id,
            ...payload,
          })
        }
        onDelete={() =>
          previewOnly
            ? undefined
            : runTodo(item.id, { action: "delete", id: item.id })
        }
      />
    );
  }

  async function runTodo(id: string | null, body: Record<string, unknown>) {
    if (id) setBusyId(id);
    else setAddBusy(true);
    try {
      if (id && (body.action === "complete" || body.action === "snooze")) {
        const kind = body.action as "complete" | "snooze";
        setExitingTodos((prev) => ({ ...prev, [id]: kind }));
        await new Promise((r) =>
          setTimeout(r, kind === "snooze" ? 480 : 360),
        );
      }
      await post("/api/todos", body);
      if (!id) setAdding(false);
    } catch (e) {
      if (id) {
        setExitingTodos((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      throw e;
    } finally {
      setBusyId(null);
      setAddBusy(false);
      if (id) {
        setExitingTodos((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  }

  async function addTodo(payload: TodoComposerPayload) {
    await runTodo(null, {
      action: "add",
      label: payload.label,
      date: payload.date,
      time: payload.time,
      recurrence: payload.recurrence,
      group: payload.group,
      undated: payload.undated,
      trackOverTime: payload.trackOverTime,
    });
    if (payload.date && !payload.undated) {
      selectDate(payload.date);
    }
  }

  if (!state.profile || !today || !month || !selectedDate) return null;

  return (
    <section
      className="home-card home-day-hub"
      aria-label="Day hub"
      data-mode={mode}
    >
      <div
        className="home-day-hub-tabs"
        role="tablist"
        aria-label="Day view"
      >
        {MODES.map((option) => {
          const selected = modeReady ? mode === option.id : option.id === "tasks";
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "home-day-hub-tab home-day-hub-tab-active"
                  : "home-day-hub-tab"
              }
              onClick={() => setMode(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {mode === "tasks" ? (
        <div className="home-day-hub-pane home-day-hub-tasks">
          <header className="home-day-hub-pane-head">
            <p className="home-card-kicker">Tasks</p>
            <button
              type="button"
              className="icon-btn"
              aria-label="Add a task"
              onClick={() => setAdding(true)}
            >
              +
            </button>
          </header>

          {adding ? (
            <TodoComposer
              today={today}
              defaultDate={selectedDate}
              busy={addBusy}
              onSubmit={addTodo}
              onCancel={() => setAdding(false)}
            />
          ) : null}

          <div className="home-day-hub-calendar">
            <TaskMonthCalendar
              monthKey={month}
              today={today}
              selectedDate={selectedDate}
              dayColors={dayColors}
              onMonthChange={setMonth}
              onSelectDate={selectDate}
            />
          </div>

          <div className="task-day-panel home-day-hub-day-panel">
            <p className="eyebrow task-day-heading">
              {selectedDate === today
                ? "Today"
                : formatDisplayDate(selectedDate)}
            </p>

            {dayTodos.length === 0 && !showUndated ? (
              <p className="muted tiny" style={{ margin: 0 }}>
                Nothing due this day — tap + to add.
              </p>
            ) : (
              <div className="daily-actions home-day-hub-task-list">
                {dayTodos.map((item) => renderTodoRow(item))}
                {showUndated
                  ? undatedTodos.map((item) =>
                      renderTodoRow(item, { undated: true }),
                    )
                  : null}
              </div>
            )}
          </div>

          <Link href="/items" className="btn ghost workout-open-link">
            Open tasks →
          </Link>
        </div>
      ) : null}

      {mode === "workout" ? (
        <div className="home-day-hub-pane home-day-hub-workout">
          <header className="home-day-hub-pane-head">
            <p className="home-card-kicker">Workout</p>
            <Link href="/workouts" className="home-day-hub-inline-link">
              Log →
            </Link>
          </header>

          <div className="home-day-hub-calendar">
            <WorkoutCalendar
              monthKey={month}
              today={today}
              workouts={state.workouts}
              selectedDate={selectedDate}
              onMonthChange={setMonth}
              onSelectDate={selectDate}
            />
          </div>

          <div className="workout-day-expand home-day-hub-day-panel fade-in">
            <p className="workout-day-expand-label">
              {formatWorkoutListDate(selectedDate)}
              {dayWorkouts.length > 0 ? (
                <span className="muted">
                  {" "}
                  · {dayWorkouts.length} session
                  {dayWorkouts.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </p>
            {dayWorkouts.length > 0 ? (
              <div className="workout-day-expand-list">
                {dayWorkouts.map((w) => (
                  <WorkoutSessionDetail key={w.id} workout={w} />
                ))}
              </div>
            ) : (
              <p className="muted tiny workout-day-expand-empty">
                No sessions this day — open Move to log one.
              </p>
            )}
          </div>

          <Link href="/workouts" className="btn ghost workout-open-link">
            Open workouts →
          </Link>
        </div>
      ) : null}

      {mode === "calendar" ? (
        <div className="home-day-hub-pane home-day-hub-calendar-mode">
          <TodayAgendaCard embedded />
        </div>
      ) : null}
    </section>
  );
}
