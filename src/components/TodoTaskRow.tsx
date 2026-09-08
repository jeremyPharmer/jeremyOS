"use client";

import { useState } from "react";
import {
  TodoComposer,
  type TodoComposerPayload,
} from "@/components/TodoComposer";
import { PrimaryButton, SecondaryButton, Sheet } from "@/components/ui";
import { addDays, formatDisplayDate } from "@/lib/journey";
import { formatRecurrence, recurrenceOf } from "@/lib/todos";
import {
  TASK_GROUP_COLORS,
  type TaskGroup,
} from "@/lib/task-groups";
import type { DayProvision } from "@/lib/types";

function formatTodoTime(time: string): string {
  const [hRaw, m] = time.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m ?? "00"} ${suffix}`;
}

function taskMeta(
  item: DayProvision,
  viewDate: string,
  today: string,
): string | null {
  const rec = recurrenceOf(item);
  const parts: string[] = [];
  if (item.undated) parts.push("No date");
  if (item.time) parts.push(formatTodoTime(item.time));
  const recLabel = formatRecurrence(rec, item.date);
  if (recLabel) parts.push(recLabel);
  if (
    !item.undated &&
    item.date !== viewDate &&
    !item.completed &&
    item.lastCompletedOn !== today
  ) {
    parts.push(formatDisplayDate(item.date));
  } else if (
    !item.undated &&
    item.date !== today &&
    viewDate === today
  ) {
    parts.push(formatDisplayDate(item.date));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TodoTaskRow({
  item,
  today,
  viewDate,
  home = false,
  busy,
  clearing = false,
  clearingKind = "complete",
  doneMeta,
  onComplete,
  onSnooze,
  onEdit,
  onDelete,
  onUndo,
}: {
  item: DayProvision;
  today: string;
  viewDate?: string;
  home?: boolean;
  busy: boolean;
  clearing?: boolean;
  clearingKind?: "complete" | "snooze";
  /** Extra meta for completed rows (e.g. done date M/D/YY) */
  doneMeta?: string | null;
  onComplete: () => void | Promise<void>;
  onSnooze: (until: "tomorrow" | string) => void | Promise<void>;
  onEdit: (payload: TodoComposerPayload) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUndo?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const activeDate = viewDate ?? today;
  const meta = doneMeta ?? taskMeta(item, activeDate, today);
  // Recurring rows keep lastCompletedOn until the next due — only treat as
  // checked when finished for good, completed today (undo), or animating out.
  const doneToday =
    Boolean(item.completed) ||
    item.lastCompletedOn === today ||
    Boolean(doneMeta) ||
    (clearing && clearingKind === "complete");
  const canSnooze = activeDate >= today && !doneToday && !item.undated;
  const group = item.group as TaskGroup | undefined;
  const barStyle = group
    ? { ["--group-color" as string]: TASK_GROUP_COLORS[group] }
    : undefined;
  const exitClass =
    clearing && clearingKind === "snooze"
      ? home
        ? " tasks-item-snoozing"
        : " todo-task-snoozing"
      : clearing
        ? " tasks-item-clearing"
        : "";

  const snoozeButton = canSnooze ? (
    <button
      type="button"
      className={home ? "tasks-action-btn" : "dismiss-btn"}
      disabled={busy}
      aria-label={`Snooze ${item.label}`}
      onClick={() => setSnoozing(true)}
    >
      Snooze
    </button>
  ) : null;

  return (
    <div
      className={`${home ? "todo-task todo-task-home" : "todo-task"}${
        group ? " has-group-bar" : ""
      }${!home && clearing && clearingKind === "snooze" ? " todo-task-snoozing" : ""}`}
      style={barStyle}
    >
      {home ? (
        <div
          className={`tasks-item${exitClass}`}
        >
          <button
            type="button"
            className="tasks-check-btn"
            disabled={busy || doneToday}
            aria-label={`Complete ${item.label}`}
            onClick={onComplete}
          >
            <span className={`tasks-check${doneToday ? " tasks-check-done" : ""}`}>
              {doneToday ? "✓" : ""}
            </span>
          </button>
          <button
            type="button"
            className="tasks-main"
            disabled={busy}
            aria-label={`Edit ${item.label}`}
            onClick={() => setEditing(true)}
          >
            <span className="tasks-body">
              <span className="tasks-title">{item.label}</span>
              {meta ? <span className="tasks-meta">{meta}</span> : null}
            </span>
          </button>
          {snoozeButton}
        </div>
      ) : (
        <div className="check-item check-item-row">
          <button
            type="button"
            className="check-box-btn"
            disabled={busy || doneToday}
            aria-label={`Complete ${item.label}`}
            onClick={onComplete}
          >
            <span className={`check-box${doneToday ? " checked" : ""}`}>
              {doneToday ? "✓" : ""}
            </span>
          </button>
          <button
            type="button"
            className="check-item-body"
            disabled={busy}
            aria-label={`Edit ${item.label}`}
            onClick={() => setEditing(true)}
          >
            <span className="check-label-stacked">
              <span className="check-label-name">{item.label}</span>
              {meta ? <span className="check-label-meta">{meta}</span> : null}
            </span>
          </button>
          {snoozeButton}
          {doneToday && onUndo && (
            <button
              type="button"
              className="dismiss-btn"
              disabled={busy}
              onClick={() => void onUndo()}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {editing && (
        <TodoComposer
          today={today}
          initial={item}
          busy={busy}
          submitLabel="Save"
          onDelete={() => {
            void onDelete();
            setEditing(false);
          }}
          onSubmit={async (payload) => {
            await onEdit(payload);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {snoozing && (
        <SnoozeOptionsSheet
          today={today}
          activeDate={activeDate}
          label={item.label}
          busy={busy}
          onPick={async (until) => {
            await onSnooze(until);
            setSnoozing(false);
          }}
          onClose={() => setSnoozing(false)}
        />
      )}
    </div>
  );
}

function SnoozeOptionsSheet({
  today,
  activeDate,
  label,
  busy,
  onPick,
  onClose,
}: {
  today: string;
  activeDate: string;
  label: string;
  busy: boolean;
  onPick: (until: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "custom">("menu");
  const base = activeDate >= today ? activeDate : today;
  const tomorrow = addDays(base, 1);
  const later = addDays(base, 3);
  const [customUntil, setCustomUntil] = useState(tomorrow);

  return (
    <Sheet
      label={`Snooze ${label}`}
      busy={busy}
      onClose={() => !busy && onClose()}
    >
      {mode === "menu" ? (
        <div className="todo-snooze-sheet todo-snooze-sheet-enter" key="menu">
          <p className="eyebrow">Snooze</p>
          <p className="tiny" style={{ marginBottom: 8 }}>
            Pick when this comes back
          </p>
          <button
            type="button"
            className="todo-snooze-option"
            disabled={busy}
            onClick={() => void onPick(tomorrow)}
          >
            <span className="todo-snooze-option-title">Tomorrow</span>
            <span className="todo-snooze-option-meta">
              {formatDisplayDate(tomorrow)}
            </span>
          </button>
          <button
            type="button"
            className="todo-snooze-option"
            disabled={busy}
            onClick={() => void onPick(later)}
          >
            <span className="todo-snooze-option-title">Later</span>
            <span className="todo-snooze-option-meta">
              +3 days · {formatDisplayDate(later)}
            </span>
          </button>
          <button
            type="button"
            className="todo-snooze-option"
            disabled={busy}
            onClick={() => setMode("custom")}
          >
            <span className="todo-snooze-option-title">Custom</span>
            <span className="todo-snooze-option-meta">Pick a date</span>
          </button>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
        </div>
      ) : (
        <div className="todo-snooze-sheet todo-snooze-sheet-enter" key="custom">
          <p className="eyebrow">Custom date</p>
          <label className="field" style={{ marginBottom: 8 }}>
            <span className="field-label">Snooze until</span>
            <input
              type="date"
              value={customUntil}
              min={tomorrow}
              onChange={(e) => setCustomUntil(e.target.value)}
            />
          </label>
          <div className="todo-composer-actions">
            <SecondaryButton onClick={() => setMode("menu")} disabled={busy}>
              Back
            </SecondaryButton>
            <PrimaryButton
              onClick={() => void onPick(customUntil)}
              disabled={busy || customUntil <= today}
            >
              Snooze
            </PrimaryButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}
