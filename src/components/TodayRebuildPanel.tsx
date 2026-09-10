"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import { truncateSupportLabel } from "@/lib/auth-constants";
import { addDays } from "@/lib/journey";
import {
  groupOpenTodos,
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
  TASK_GROUPS,
  type GroupedOpenTodos,
  type TaskGroup,
} from "@/lib/task-groups";
import { openTodosOn } from "@/lib/todos";
import { dayAbbrev } from "@/lib/weather";
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
      className={`tasks-item home-routine-item${
        clearing ? " tasks-item-clearing" : ""
      }`}
      aria-live={clearing ? "polite" : undefined}
    >
      {href ? (
        <Link href={href} className="tasks-main">
          {main}
        </Link>
      ) : onActivate ? (
        <button
          type="button"
          className="tasks-main"
          disabled={activateBusy}
          onClick={onActivate}
        >
          {main}
        </button>
      ) : (
        <div className="tasks-main">{main}</div>
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

/** Open groups for Home; ensure Home appears when Start/Close routines are open. */
function homeOpenGroups(
  todos: ReturnType<typeof openTodosOn>,
  today: string,
  includeHomeRoutines: boolean,
): GroupedOpenTodos[] {
  const grouped = groupOpenTodos(todos, today);
  if (!includeHomeRoutines || grouped.some((g) => g.group === "home")) {
    return grouped;
  }
  const withHome: GroupedOpenTodos[] = [
    ...grouped,
    { group: "home", dated: [], undated: [] },
  ];
  return withHome.sort(
    (a, b) => TASK_GROUPS.indexOf(a.group) - TASK_GROUPS.indexOf(b.group),
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
  const [exitingTodos, setExitingTodos] = useState<
    Record<string, "complete" | "snooze">
  >({});

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
  const showMorningDismissing =
    onToday && dismissing.some((d) => d.key === "morning");
  const showEveningDismissing =
    onToday && dismissing.some((d) => d.key === "evening");
  const showSupports =
    onToday && (openSupports.length > 0 || exiting.length > 0 ||
      dismissing.some((d) => d.key !== "morning" && d.key !== "evening"));
  const homeRoutinesOpen =
    showMorningOpen ||
    showEveningOpen ||
    showMorningDismissing ||
    showEveningDismissing ||
    showSupports;

  const openGroups = homeOpenGroups(openTodos, today, homeRoutinesOpen);

  const routineCount =
    (showMorningOpen || showMorningDismissing ? 1 : 0) +
    openSupports.length +
    exiting.length +
    dismissing.filter((d) => d.key !== "morning" && d.key !== "evening").length +
    (showEveningOpen || showEveningDismissing ? 1 : 0);
  const openCount = routineCount + openTodos.length;

  const todayPersonal = openTodosOn(todos, today).length;
  const todayRoutineCount =
    (morningDone || morningSkipped ? 0 : 1) +
    enabledSupports.filter(
      (s) => !skips.has(s.type) && !completedSupportTypes.has(s.type),
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
      if (body.action === "complete" || body.action === "snooze") {
        const kind = body.action === "snooze" ? "snooze" : "complete";
        setExitingTodos((prev) =>
          prev[id] ? prev : { ...prev, [id]: kind },
        );
        await new Promise((r) =>
          setTimeout(r, kind === "snooze" ? 380 : 420),
        );
      }
      await post("/api/todos", body);
    } catch (e) {
      setExitingTodos((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      throw e;
    } finally {
      setTodoBusyId(null);
      setExitingTodos((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
        notes: payload.notes,
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
        clearing={Boolean(exitingTodos[p.id])}
        clearingKind={exitingTodos[p.id] ?? "complete"}
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
    const isHome = group === "home";
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
        {isHome && showMorningOpen ? (
          <HomeRoutineRow
            label="Start the day"
            href="/morning"
            onDismiss={() =>
              dismissItem({ key: "morning", label: "Start the day" })
            }
            dismissBusy={skipBusy === "morning"}
          />
        ) : null}
        {isHome && showMorningDismissing
          ? dismissing
              .filter((d) => d.key === "morning")
              .map((d) => <DismissingTaskRow key={d.key} label={d.label} />)
          : null}
        {isHome && onToday
          ? enabledSupports.map((s) => {
              const weekDone =
                dashboard!.week.find((w) => w.type === s.type)?.done ?? 0;
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
            })
          : null}
        {section.dated.map(renderTodoRow)}
        {section.undated.length > 0 ? (
          <>
            <p className="tiny muted task-group-nodate">No date</p>
            {section.undated.map(renderTodoRow)}
          </>
        ) : null}
        {isHome && showEveningOpen ? (
          <HomeRoutineRow
            label="Close the day"
            href="/evening"
            onDismiss={() =>
              dismissItem({ key: "evening", label: "Close the day" })
            }
            dismissBusy={skipBusy === "evening"}
          />
        ) : null}
        {isHome && showEveningDismissing
          ? dismissing
              .filter((d) => d.key === "evening")
              .map((d) => <DismissingTaskRow key={d.key} label={d.label} />)
          : null}
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
