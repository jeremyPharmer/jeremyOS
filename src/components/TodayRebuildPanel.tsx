"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import { truncateSupportLabel } from "@/lib/auth-constants";
import { addDays } from "@/lib/journey";
import { openTodosOn } from "@/lib/todos";
import { dayAbbrev } from "@/lib/weather";
import type { DayProvision } from "@/lib/types";
import type { SupportType } from "@/lib/types";

function threeDayWindow(start: string): [string, string, string] {
  return [start, addDays(start, 1), addDays(start, 2)];
}
type SkipKey = SupportType | "morning" | "evening";

type DismissingItem = {
  key: SkipKey;
  label: string;
  meta?: string;
};

type ExitingSupport = {
  type: SupportType;
  label: string;
  weekDone: number;
  weeklyTarget: number;
};

function sortTodosForDay(items: DayProvision[]): DayProvision[] {
  return [...items].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time) || a.label.localeCompare(b.label);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.label.localeCompare(b.label);
  });
}

function DismissingTaskRow({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="tasks-item tasks-item-dismissing" aria-live="polite">
      <span className="tasks-check tasks-check-static" aria-hidden />
      <div className="tasks-body" aria-hidden>
        <span className="tasks-title">{label}</span>
        {meta ? <span className="tasks-meta">{meta}</span> : null}
      </div>
    </div>
  );
}

function HomeRoutineRow({
  label,
  meta,
  href,
  onActivate,
  onDismiss,
  dismissLabel = "Not today",
  dismissBusy,
  activateBusy,
  clearing,
  checked,
}: {
  label: string;
  meta?: string;
  href?: string;
  onActivate?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  dismissBusy?: boolean;
  activateBusy?: boolean;
  clearing?: boolean;
  checked?: boolean;
}) {
  const main = (
    <>
      <span className={`tasks-check${checked ? " tasks-check-done" : ""}`}>
        {checked ? "✓" : ""}
      </span>
      <span className="tasks-body">
        <span className="tasks-title">{label}</span>
        {meta ? <span className="tasks-meta">{meta}</span> : null}
      </span>
    </>
  );

  return (
    <div
      className={`tasks-item${clearing ? " tasks-item-clearing" : ""}`}
      aria-live={clearing ? "polite" : undefined}
    >
      {href ? (
        <Link href={href} className="tasks-main">
          {main}
        </Link>
      ) : (
        <button
          type="button"
          className="tasks-main"
          disabled={activateBusy}
          onClick={onActivate}
        >
          {main}
        </button>
      )}
      {onDismiss ? (
        <button
          type="button"
          className="tasks-action-btn"
          disabled={dismissBusy}
          onClick={onDismiss}
        >
          {dismissLabel}
        </button>
      ) : null}
      {clearing ? (
        <span className="tasks-clear-burst" aria-hidden>
          +1
        </span>
      ) : null}
    </div>
  );
}

export function TodayRebuildPanel() {
  const { state, dashboard, today, post } = useApp();
  const [viewDate, setViewDate] = useState(today);
  const [windowStart, setWindowStart] = useState(today);
  const [busyType, setBusyType] = useState<SupportType | null>(null);
  const [skipBusy, setSkipBusy] = useState<SkipKey | null>(null);
  const [exiting, setExiting] = useState<ExitingSupport[]>([]);
  const [dismissing, setDismissing] = useState<DismissingItem[]>([]);
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
    () => sortTodosForDay(openTodosOn(todos, viewDate)),
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

  const skips = new Set(dashboard.todaySkips ?? []);
  const enabledSupports = state.profile.supports.filter((s) => s.enabled);
  const completedSupportTypes = new Set(
    dashboard.todaySupports.map((t) => t.supportType),
  );
  const exitingTypes = new Set(exiting.map((e) => e.type));
  const dismissingKeys = new Set(dismissing.map((d) => d.key));
  const openSupports = enabledSupports.filter(
    (s) =>
      !skips.has(s.type) &&
      !completedSupportTypes.has(s.type) &&
      !exitingTypes.has(s.type) &&
      !dismissingKeys.has(s.type),
  );
  const morningSkipped = skips.has("morning");
  const eveningSkipped = skips.has("evening");
  // Prefer live state so Home clears as soon as morning is saved (dashboard can lag).
  const morningDone =
    Boolean(dashboard.todayMorning) ||
    state.mornings.some((m) => m.date === today);
  const eveningDone =
    Boolean(dashboard.todayEvening) ||
    state.evenings.some((e) => e.date === today);
  const showMorningOpen =
    onToday && !morningDone && !morningSkipped && !dismissingKeys.has("morning");
  const showEveningOpen =
    onToday && !eveningDone && !eveningSkipped && !dismissingKeys.has("evening");
  const routineCount =
    (showMorningOpen ? 1 : 0) +
    openSupports.length +
    exiting.length +
    dismissing.filter((d) => d.key !== "evening").length +
    (showEveningOpen ? 1 : 0);
  const openCount = routineCount + openTodos.length;

  const todayPersonal = openTodosOn(todos, today).length;
  const todayRoutineOpen =
    (showMorningOpen ? 1 : 0) +
    openSupports.length +
    exiting.length +
    dismissing.filter((d) => d.key !== "evening").length +
    (showEveningOpen ? 1 : 0);
  // When viewing another day, showMorningOpen is false — recompute today routines directly.
  const todayRoutineCount =
    viewDate === today
      ? todayRoutineOpen
      : (morningDone || morningSkipped ? 0 : 1) +
        enabledSupports.filter(
          (s) =>
            !skips.has(s.type) &&
            !completedSupportTypes.has(s.type),
        ).length +
        (eveningDone || eveningSkipped ? 0 : 1);
  const todayOpenTotal =
    viewDate === today ? openCount : todayRoutineCount + todayPersonal;

  const stripCounts = stripDays.map((date) => {
    if (date === today) {
      return { date, count: todayOpenTotal, done: todayOpenTotal === 0 };
    }
    const personal = openTodosOn(todos, date).length;
    return { date, count: personal, done: false };
  });

  async function completeSupport(item: ExitingSupport) {
    setBusyType(item.type);
    setExiting((prev) =>
      prev.some((e) => e.type === item.type) ? prev : [...prev, item],
    );
    try {
      await Promise.all([
        post("/api/support", {
          date: today,
          supportType: item.type,
          completed: true,
        }),
        new Promise((r) => setTimeout(r, 700)),
      ]);
    } finally {
      setExiting((prev) => prev.filter((e) => e.type !== item.type));
      setBusyType(null);
    }
  }

  async function dismissItem(item: DismissingItem) {
    setDismissing((prev) =>
      prev.some((d) => d.key === item.key) ? prev : [...prev, item],
    );
    setSkipBusy(item.key);
    try {
      await Promise.all([
        post("/api/skip", { date: today, itemKey: item.key }),
        new Promise((r) => setTimeout(r, 700)),
      ]);
    } finally {
      setDismissing((prev) => prev.filter((d) => d.key !== item.key));
      setSkipBusy(null);
    }
  }

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
          {onToday && showMorningOpen && (
            <HomeRoutineRow
              label="Start the day"
              href="/morning"
              onDismiss={() =>
                dismissItem({ key: "morning", label: "Start the day" })
              }
              dismissBusy={skipBusy === "morning"}
            />
          )}

          {onToday &&
            dismissing
              .filter((d) => d.key === "morning")
              .map((d) => (
                <DismissingTaskRow key={d.key} label={d.label} />
              ))}

          {onToday &&
            enabledSupports.map((s) => {
              const weekDone =
                dashboard.week.find((w) => w.type === s.type)?.done ?? 0;
              const weekMeta = `${weekDone}/${s.weeklyTarget} this week`;
              const dismissingItem = dismissing.find((d) => d.key === s.type);

              if (dismissingItem) {
                return (
                  <DismissingTaskRow
                    key={s.type}
                    label={dismissingItem.label}
                    meta={dismissingItem.meta}
                  />
                );
              }

              if (skips.has(s.type)) return null;

              const isExiting = exitingTypes.has(s.type);
              const isDone = completedSupportTypes.has(s.type) && !isExiting;
              if (isDone) return null;

              const exitingItem = exiting.find((e) => e.type === s.type);

              if (isExiting && exitingItem) {
                return (
                  <HomeRoutineRow
                    key={s.type}
                    label={truncateSupportLabel(exitingItem.label)}
                    meta={`${exitingItem.weekDone + 1}/${exitingItem.weeklyTarget} this week`}
                    clearing
                    checked
                  />
                );
              }

              return (
                <HomeRoutineRow
                  key={s.type}
                  label={truncateSupportLabel(s.label)}
                  meta={weekMeta}
                  activateBusy={busyType === s.type}
                  onActivate={() =>
                    completeSupport({
                      type: s.type,
                      label: s.label,
                      weekDone,
                      weeklyTarget: s.weeklyTarget,
                    })
                  }
                  onDismiss={() =>
                    dismissItem({
                      key: s.type,
                      label: truncateSupportLabel(s.label),
                      meta: weekMeta,
                    })
                  }
                  dismissBusy={skipBusy === s.type}
                />
              );
            })}

          {openTodos.map((p) => (
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
          ))}

          {onToday && showEveningOpen && (
            <HomeRoutineRow
              label="Close the day"
              href="/evening"
              onDismiss={() =>
                dismissItem({ key: "evening", label: "Close the day" })
              }
              dismissBusy={skipBusy === "evening"}
            />
          )}

          {onToday &&
            dismissing
              .filter((d) => d.key === "evening")
              .map((d) => (
                <DismissingTaskRow key={d.key} label={d.label} />
              ))}
        </div>
      ) : onToday ? (
        <div
          className="tasks-complete"
          aria-label="All tasks complete"
        />
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
