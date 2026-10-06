"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import { TaskAnalyticsPanel } from "@/components/TaskAnalyticsPanel";
import {
  completedTodosOn,
  doneDateLabel,
  openDatedTodosOn,
  openUndatedTodos,
} from "@/lib/task-groups";
import type { DayProvision } from "@/lib/types";

export default function ItemsPage() {
  const { state, today, post } = useApp();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exitingTodos, setExitingTodos] = useState<
    Record<string, "complete" | "snooze">
  >({});
  const [completedOpen, setCompletedOpen] = useState(false);
  const [undatedOpen, setUndatedOpen] = useState(true);

  useEffect(() => {
    if (!state.profile?.onboarded) router.replace("/onboarding");
  }, [state.profile, router]);

  const todos = state.dayProvisions ?? [];
  const dayTodos = useMemo(
    () => (today ? openDatedTodosOn(todos, today) : []),
    [todos, today],
  );
  const undatedTodos = useMemo(() => openUndatedTodos(todos), [todos]);
  const dayCompleted = useMemo(
    () => (today ? completedTodosOn(todos, today) : []),
    [todos, today],
  );

  async function run(id: string | null, body: Record<string, unknown>) {
    if (id) setBusyId(id);
    else setAddBusy(true);
    try {
      if (id && (body.action === "complete" || body.action === "snooze")) {
        const kind = body.action as "complete" | "snooze";
        setExitingTodos((prev) => ({ ...prev, [id]: kind }));
        await new Promise((r) =>
          setTimeout(r, kind === "snooze" ? 780 : 620),
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

  async function add(payload: TodoComposerPayload) {
    await run(null, {
      action: "add",
      label: payload.label,
      date: payload.date,
      time: payload.time,
      recurrence: payload.recurrence,
      group: payload.group,
      undated: payload.undated,
      trackOverTime: payload.trackOverTime,
    });
  }

  function renderRow(
    item: DayProvision,
    opts?: { done?: boolean; snooze?: boolean },
  ) {
    return (
      <TodoTaskRow
        key={item.id}
        item={item}
        today={today!}
        viewDate={today}
        busy={busyId === item.id}
        clearing={exitingTodos[item.id] === "complete"}
        snoozingOut={exitingTodos[item.id] === "snooze"}
        doneMeta={opts?.done ? doneDateLabel(item) || null : null}
        onComplete={() =>
          opts?.done
            ? undefined
            : run(item.id, { action: "complete", id: item.id })
        }
        onSnooze={(until) =>
          opts?.snooze === false || opts?.done
            ? undefined
            : run(item.id, { action: "snooze", id: item.id, until })
        }
        onEdit={(payload) =>
          void run(item.id, {
            action: "edit",
            id: item.id,
            label: payload.label,
            date: payload.date,
            time: payload.time,
            recurrence: payload.recurrence,
            group: payload.group,
            undated: payload.undated,
            trackOverTime: payload.trackOverTime,
          })
        }
        onDelete={() => run(item.id, { action: "delete", id: item.id })}
        onUndo={
          opts?.done
            ? () => run(item.id, { action: "undo", id: item.id })
            : undefined
        }
      />
    );
  }

  if (!state.profile?.onboarded || !today) {
    return null;
  }

  return (
    <main className="stack fade-in">
      <p className="eyebrow">Tasks</p>
      <h1>Tasks</h1>
      <p className="muted">
        Master list for today — pick days from the Home calendar.
      </p>

      <TaskAnalyticsPanel />

      <button
        type="button"
        className="todo-add-toggle"
        onClick={() => setAdding(true)}
      >
        <span>Add a task</span>
        <span className="morning-add-plus" aria-hidden>
          +
        </span>
      </button>

      {adding && (
        <TodoComposer
          today={today}
          busy={addBusy}
          onSubmit={add}
          onCancel={() => setAdding(false)}
        />
      )}

      <section className="panel task-day-panel">
        <p className="eyebrow task-day-heading">Today</p>
        {dayTodos.length === 0 ? (
          <p className="muted tiny" style={{ margin: 0 }}>
            Nothing due today.
          </p>
        ) : (
          <div className="daily-actions">
            {dayTodos.map((item) => renderRow(item))}
          </div>
        )}

        {dayCompleted.length > 0 && (
          <div className="task-group-completed">
            <button
              type="button"
              className="task-group-completed-toggle"
              aria-expanded={completedOpen}
              onClick={() => setCompletedOpen((v) => !v)}
            >
              <span className="task-group-chevron" aria-hidden>
                {completedOpen ? "▾" : "▸"}
              </span>
              Completed ({dayCompleted.length})
            </button>
            {completedOpen && (
              <div className="daily-actions">
                {dayCompleted.map((item) =>
                  renderRow(item, { done: true, snooze: false }),
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {undatedTodos.length > 0 && (
        <section className="panel task-undated-panel">
          <button
            type="button"
            className="task-group-completed-toggle"
            aria-expanded={undatedOpen}
            onClick={() => setUndatedOpen((v) => !v)}
          >
            <span className="task-group-chevron" aria-hidden>
              {undatedOpen ? "▾" : "▸"}
            </span>
            No date ({undatedTodos.length})
          </button>
          {undatedOpen && (
            <div className="daily-actions">
              {undatedTodos.map((item) =>
                renderRow(item, { snooze: false }),
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
