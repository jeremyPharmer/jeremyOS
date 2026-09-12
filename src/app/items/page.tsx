"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { TodoTaskRow } from "@/components/TodoTaskRow";
import {
  doneDateLabel,
  groupCompletedTodos,
  groupOpenTodos,
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
} from "@/lib/task-groups";

export default function ItemsPage() {
  const { state, today, post } = useApp();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openCompleted, setOpenCompleted] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (!state.profile?.onboarded) router.replace("/onboarding");
  }, [state.profile, router]);

  const todos = state.dayProvisions ?? [];
  const openGroups = useMemo(
    () => (today ? groupOpenTodos(todos, today) : []),
    [todos, today],
  );
  const completedGroups = useMemo(
    () => (today ? groupCompletedTodos(todos, today) : []),
    [todos, today],
  );

  async function run(id: string | null, body: Record<string, unknown>) {
    if (id) setBusyId(id);
    else setAddBusy(true);
    try {
      await post("/api/todos", body);
      if (!id) setAdding(false);
    } finally {
      setBusyId(null);
      setAddBusy(false);
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

  if (!state.profile?.onboarded || !today) return null;

  return (
    <main className="stack fade-in">
      <p className="eyebrow">Tasks</p>
      <h1>Tasks</h1>
      <p className="muted">Grouped by life area — open first, completed under each.</p>

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

      {openGroups.length === 0 && (
        <section className="panel">
          <p className="muted" style={{ margin: 0 }}>
            Nothing open. Add a task to get started.
          </p>
        </section>
      )}

      {openGroups.map(({ group, dated, undated }) => {
        const completed = completedGroups.find((c) => c.group === group);
        const completedOpen = Boolean(openCompleted[group]);
        return (
          <section
            key={group}
            className="panel task-group-section"
            style={{ ["--group-color" as string]: TASK_GROUP_COLORS[group] }}
          >
            <p className="eyebrow task-group-heading">
              <span className="task-group-heading-swatch" aria-hidden />
              {TASK_GROUP_LABELS[group]}
            </p>
            <div className="daily-actions">
              {dated.map((item) => (
                <TodoTaskRow
                  key={item.id}
                  item={item}
                  today={today}
                  busy={busyId === item.id}
                  onComplete={() =>
                    run(item.id, { action: "complete", id: item.id })
                  }
                  onSnooze={(until) =>
                    run(item.id, { action: "snooze", id: item.id, until })
                  }
                  onEdit={(payload) =>
                    run(item.id, {
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
                  onDelete={() =>
                    run(item.id, { action: "delete", id: item.id })
                  }
                />
              ))}
              {undated.length > 0 && (
                <>
                  <p className="tiny muted task-group-nodate">No date</p>
                  {undated.map((item) => (
                    <TodoTaskRow
                      key={item.id}
                      item={item}
                      today={today}
                      busy={busyId === item.id}
                      onComplete={() =>
                        run(item.id, { action: "complete", id: item.id })
                      }
                      onSnooze={() => undefined}
                      onEdit={(payload) =>
                        run(item.id, {
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
                      onDelete={() =>
                        run(item.id, { action: "delete", id: item.id })
                      }
                    />
                  ))}
                </>
              )}
            </div>

            {completed && completed.items.length > 0 && (
              <div className="task-group-completed">
                <button
                  type="button"
                  className="task-group-completed-toggle"
                  aria-expanded={completedOpen}
                  onClick={() =>
                    setOpenCompleted((prev) => ({
                      ...prev,
                      [group]: !prev[group],
                    }))
                  }
                >
                  <span className="task-group-chevron" aria-hidden>
                    {completedOpen ? "▾" : "▸"}
                  </span>
                  Completed ({completed.items.length})
                </button>
                {completedOpen && (
                  <div className="daily-actions">
                    {completed.items.map((item) => (
                      <TodoTaskRow
                        key={item.id}
                        item={item}
                        today={today}
                        busy={busyId === item.id}
                        doneMeta={doneDateLabel(item) || null}
                        onComplete={() => undefined}
                        onSnooze={() => undefined}
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
                        onDelete={() =>
                          run(item.id, { action: "delete", id: item.id })
                        }
                        onUndo={() =>
                          run(item.id, { action: "undo", id: item.id })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Completed-only groups (no open items) */}
      {completedGroups
        .filter((c) => !openGroups.some((o) => o.group === c.group))
        .map(({ group, items }) => {
          const completedOpen = Boolean(openCompleted[group]);
          return (
            <section
              key={`done-${group}`}
              className="panel task-group-section"
              style={{ ["--group-color" as string]: TASK_GROUP_COLORS[group] }}
            >
              <p className="eyebrow task-group-heading">
                <span className="task-group-heading-swatch" aria-hidden />
                {TASK_GROUP_LABELS[group]}
              </p>
              <div className="task-group-completed">
                <button
                  type="button"
                  className="task-group-completed-toggle"
                  aria-expanded={completedOpen}
                  onClick={() =>
                    setOpenCompleted((prev) => ({
                      ...prev,
                      [group]: !prev[group],
                    }))
                  }
                >
                  <span className="task-group-chevron" aria-hidden>
                    {completedOpen ? "▾" : "▸"}
                  </span>
                  Completed ({items.length})
                </button>
                {completedOpen && (
                  <div className="daily-actions">
                    {items.map((item) => (
                      <TodoTaskRow
                        key={item.id}
                        item={item}
                        today={today}
                        busy={busyId === item.id}
                        doneMeta={doneDateLabel(item) || null}
                        onComplete={() => undefined}
                        onSnooze={() => undefined}
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
                        onDelete={() =>
                          run(item.id, { action: "delete", id: item.id })
                        }
                        onUndo={() =>
                          run(item.id, { action: "undo", id: item.id })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
    </main>
  );
}
