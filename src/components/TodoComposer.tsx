"use client";

import { useMemo, useState } from "react";
import {
  PrimaryButton,
  SecondaryButton,
  Sheet,
} from "@/components/ui";
import { TaskGroupPicker } from "@/components/TaskGroupPicker";
import { addDays, parseDate } from "@/lib/journey";
import {
  WEEKDAY_LABELS,
  WEEKDAY_LETTERS,
  firstDueDate,
  formatRecurrence,
  recurrenceOf,
} from "@/lib/todos";
import type { TaskGroup } from "@/lib/task-groups";
import type { DayProvision, TodoRecurrence } from "@/lib/types";

export type TodoComposerPayload = {
  label: string;
  date: string;
  time?: string;
  recurrence: TodoRecurrence;
  group: TaskGroup;
  /** Always explicit so edit can clear “No due date”. */
  undated: boolean;
  /** When repeating, log completions for Journey adherence (RB-032). */
  trackOverTime: boolean;
};

type EndsMode = "never" | "on" | "after";
type Frequency = "day" | "week" | "month" | "year";

const FREQ_UNITS: { id: Frequency; singular: string; plural: string }[] = [
  { id: "day", singular: "day", plural: "days" },
  { id: "week", singular: "week", plural: "weeks" },
  { id: "month", singular: "month", plural: "months" },
  { id: "year", singular: "year", plural: "years" },
];

type CustomFields = {
  weekdays: number[];
  frequency: Frequency;
  interval: number;
  monthlyOn: "day" | "nth_weekday";
  endsMode: EndsMode;
  endsDate: string;
  endsCount: number;
};

function defaultWeekday(dueDate: string, today: string): number {
  return parseDate(dueDate || today).getDay();
}

function customFieldsFromRecurrence(
  rec: TodoRecurrence,
  dueDate: string,
  today: string,
): CustomFields {
  const weekday = defaultWeekday(dueDate, today);
  if (rec.kind === "daily") {
    return {
      frequency: "day",
      interval: 1,
      weekdays: [weekday],
      monthlyOn: "day",
      endsMode: "never",
      endsDate: today,
      endsCount: 13,
    };
  }
  if (rec.kind === "weekly") {
    return {
      frequency: "week",
      interval: 1,
      weekdays: rec.weekdays,
      monthlyOn: "day",
      endsMode: "never",
      endsDate: today,
      endsCount: 13,
    };
  }
  if (rec.kind === "every_n_days") {
    return {
      frequency: "day",
      interval: rec.n,
      weekdays: [weekday],
      monthlyOn: "day",
      endsMode: "never",
      endsDate: today,
      endsCount: 13,
    };
  }
  if (rec.kind === "monthly_first") {
    return {
      frequency: "month",
      interval: 1,
      weekdays: [weekday],
      monthlyOn: "day",
      endsMode: "never",
      endsDate: today,
      endsCount: 13,
    };
  }
  if (rec.kind === "repeat") {
    let endsMode: EndsMode = "never";
    let endsDate = today;
    let endsCount = 13;
    if (rec.ends?.type === "on") {
      endsMode = "on";
      endsDate = rec.ends.date;
    } else if (rec.ends?.type === "after") {
      endsMode = "after";
      endsCount = rec.ends.count;
    }
    return {
      frequency: rec.frequency,
      interval: rec.interval,
      weekdays: rec.weekdays?.length ? rec.weekdays : [weekday],
      monthlyOn: rec.monthlyOn === "nth_weekday" ? "nth_weekday" : "day",
      endsMode,
      endsDate,
      endsCount,
    };
  }
  return {
    frequency: "week",
    interval: 1,
    weekdays: [weekday],
    monthlyOn: "day",
    endsMode: "never",
    endsDate: today,
    endsCount: 13,
  };
}

function buildCustomRecurrence(
  dueDate: string,
  today: string,
  fields: CustomFields,
): TodoRecurrence {
  const ends =
    fields.endsMode === "on"
      ? ({ type: "on", date: fields.endsDate } as const)
      : fields.endsMode === "after"
        ? ({ type: "after", count: fields.endsCount } as const)
        : ({ type: "never" } as const);
  const interval = Math.max(1, fields.interval);
  const weekday = defaultWeekday(dueDate, today);

  if (fields.frequency === "week") {
    return {
      kind: "repeat",
      frequency: "week",
      interval,
      weekdays:
        fields.weekdays.length > 0 ? fields.weekdays : [weekday],
      ends,
    };
  }
  if (fields.frequency === "month") {
    return {
      kind: "repeat",
      frequency: "month",
      interval,
      monthlyOn: fields.monthlyOn,
      ends,
    };
  }
  return { kind: "repeat", frequency: fields.frequency, interval, ends };
}

function validateCustomFields(
  fields: CustomFields,
  dueDate: string,
): string | null {
  if (fields.frequency === "week" && fields.weekdays.length === 0) {
    return "Pick at least one weekday";
  }
  if (fields.endsMode === "on" && fields.endsDate < dueDate) {
    return "End date must be on or after the due date";
  }
  return null;
}

function WeekdayPicker({
  weekdays,
  onToggle,
}: {
  weekdays: number[];
  onToggle: (d: number) => void;
}) {
  return (
    <div className="todo-repeat-on-days" role="group" aria-label="Repeat on">
      {WEEKDAY_LETTERS.map((name, d) => (
        <button
          key={`${name}-${d}`}
          type="button"
          className={
            weekdays.includes(d) ? "todo-repeat-day selected" : "todo-repeat-day"
          }
          onClick={() => onToggle(d)}
          aria-pressed={weekdays.includes(d)}
          aria-label={WEEKDAY_LABELS[d]}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function CustomRecurrenceSheet({
  today,
  dueDate,
  fields,
  busy,
  onChange,
  onDone,
  onCancel,
}: {
  today: string;
  dueDate: string;
  fields: CustomFields;
  busy: boolean;
  onChange: (next: CustomFields) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");

  function toggleWeekday(d: number) {
    onChange({
      ...fields,
      weekdays: fields.weekdays.includes(d)
        ? fields.weekdays.filter((x) => x !== d)
        : [...fields.weekdays, d].sort(),
    });
  }

  function handleDone() {
    const message = validateCustomFields(fields, dueDate || today);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    onDone();
  }

  return (
    <Sheet label="Repeat schedule" busy={busy} onClose={onCancel}>
      <div className="todo-composer-sheet fade-in">
        <p className="eyebrow">Repeat schedule</p>

        <div className="todo-custom-repeat">
          <div className="todo-repeat-row">
            <span className="todo-repeat-label">Repeat every</span>
            <div className="todo-interval-row">
              <input
                type="number"
                min={1}
                max={99}
                value={fields.interval}
                onChange={(e) =>
                  onChange({
                    ...fields,
                    interval: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                aria-label="Repeat interval"
              />
              <select
                value={fields.frequency}
                onChange={(e) =>
                  onChange({
                    ...fields,
                    frequency: e.target.value as Frequency,
                  })
                }
                aria-label="Repeat unit"
              >
                {FREQ_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {fields.interval === 1 ? u.singular : u.plural}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fields.frequency === "week" && (
            <div className="todo-repeat-row">
              <span className="todo-repeat-label">Repeat on</span>
              <WeekdayPicker weekdays={fields.weekdays} onToggle={toggleWeekday} />
            </div>
          )}

          {fields.frequency === "month" && (
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Monthly on</span>
              <select
                value={fields.monthlyOn}
                onChange={(e) =>
                  onChange({
                    ...fields,
                    monthlyOn: e.target.value as "day" | "nth_weekday",
                  })
                }
              >
                <option value="day">Same calendar day (e.g. 1st)</option>
                <option value="nth_weekday">Same weekday (e.g. 2nd Tue)</option>
              </select>
            </label>
          )}

          <div className="todo-repeat-row todo-ends-block">
            <span className="todo-repeat-label">Ends</span>
            <div className="todo-ends-options" role="radiogroup" aria-label="Ends">
              <label className="todo-ends-option">
                <input
                  type="radio"
                  name="todo-ends"
                  checked={fields.endsMode === "never"}
                  onChange={() => onChange({ ...fields, endsMode: "never" })}
                />
                <span>Never</span>
              </label>
              <label className="todo-ends-option">
                <input
                  type="radio"
                  name="todo-ends"
                  checked={fields.endsMode === "on"}
                  onChange={() => onChange({ ...fields, endsMode: "on" })}
                />
                <span>On</span>
                <input
                  type="date"
                  className="todo-ends-inline-date"
                  value={fields.endsDate}
                  min={dueDate || today}
                  disabled={fields.endsMode !== "on"}
                  onChange={(e) =>
                    onChange({ ...fields, endsDate: e.target.value })
                  }
                  aria-label="End date"
                />
              </label>
              <label className="todo-ends-option">
                <input
                  type="radio"
                  name="todo-ends"
                  checked={fields.endsMode === "after"}
                  onChange={() => onChange({ ...fields, endsMode: "after" })}
                />
                <span>After</span>
                <input
                  type="number"
                  className="todo-ends-inline-count"
                  min={1}
                  max={999}
                  value={fields.endsCount}
                  disabled={fields.endsMode !== "after"}
                  onChange={(e) =>
                    onChange({
                      ...fields,
                      endsCount: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  aria-label="Occurrences"
                />
                <span className="todo-ends-suffix">occurrences</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="tiny" style={{ color: "var(--danger)", margin: 0 }}>
            {error}
          </p>
        )}

        <div className="todo-composer-actions">
          <SecondaryButton onClick={onCancel} disabled={busy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleDone} disabled={busy}>
            Done
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  );
}

export function TodoComposer({
  today,
  defaultDate,
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  today: string;
  defaultDate?: string;
  initial?: DayProvision | null;
  busy: boolean;
  submitLabel?: string;
  onSubmit: (payload: TodoComposerPayload) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const initialRec = initial ? recurrenceOf(initial) : { kind: "none" as const };
  const initialDue = initial?.date ?? defaultDate ?? today;
  const initialFields = customFieldsFromRecurrence(
    initialRec,
    initialDue,
    today,
  );

  const [label, setLabel] = useState(initial?.label ?? "");
  const [date, setDate] = useState(initialDue);
  const [undated, setUndated] = useState(Boolean(initial?.undated));
  const [group, setGroup] = useState<TaskGroup | "">(initial?.group ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [hasTime, setHasTime] = useState(Boolean(initial?.time));
  const [repeats, setRepeats] = useState(initialRec.kind !== "none");
  const [trackOverTime, setTrackOverTime] = useState(
    Boolean(initial?.trackOverTime) && initialRec.kind !== "none",
  );
  const [customFields, setCustomFields] = useState<CustomFields>(initialFields);
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (initial ? "Edit task" : "New task"),
    [initial],
  );

  const schedulePreview = useMemo(() => {
    if (!repeats) return "";
    return formatRecurrence(
      buildCustomRecurrence(date || today, today, customFields),
      date || today,
    );
  }, [repeats, date, today, customFields]);

  function openCustomSheet() {
    if (customFields.weekdays.length === 0) {
      setCustomFields((prev) => ({
        ...prev,
        weekdays: [defaultWeekday(date || today, today)],
      }));
    }
    setCustomOpen(true);
  }

  function setRepeatsYes() {
    setRepeats(true);
    openCustomSheet();
  }

  function setRepeatsNo() {
    setRepeats(false);
    setTrackOverTime(false);
    setCustomOpen(false);
    setError("");
  }

  async function submit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (!group) {
      setError("Pick a group");
      return;
    }

    let recurrence: TodoRecurrence = { kind: "none" };
    if (repeats && !undated) {
      const message = validateCustomFields(customFields, date || today);
      if (message) {
        setError(message);
        openCustomSheet();
        return;
      }
      recurrence = buildCustomRecurrence(date || today, today, customFields);
    }

    const due = undated
      ? today
      : date ||
        (initial ? initial.date : firstDueDate(today, recurrence));
    setError("");
    await onSubmit({
      label: trimmed,
      date: due,
      time: !undated && hasTime && time ? time : undefined,
      recurrence: undated ? { kind: "none" } : recurrence,
      group,
      undated,
      trackOverTime: Boolean(repeats && !undated && trackOverTime),
    });
  }

  return (
    <>
      <Sheet label={title} busy={busy} onClose={onCancel}>
        <div className="todo-composer-sheet fade-in">
          <p className="eyebrow">{title}</p>

          <label className="field">
            <span className="field-label">Task</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What needs doing?"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </label>

          <TaskGroupPicker value={group} onChange={setGroup} />

          <label className="check-inline">
            <input
              type="checkbox"
              checked={undated}
              onChange={(e) => {
                const next = e.target.checked;
                setUndated(next);
                if (next) {
                  setRepeats(false);
                  setHasTime(false);
                  setTime("");
                } else if (!date) {
                  setDate(today);
                }
              }}
            />
            No due date
          </label>

          {!undated && (
          <div className="todo-composer-datetime">
            <label className="field todo-composer-field">
              <span className="field-label">Date</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <div className="field todo-composer-field">
              <span className="field-label">Time</span>
              {hasTime ? (
                <div className="todo-time-row">
                  <input
                    type="time"
                    value={time || "09:00"}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setHasTime(false);
                      setTime("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="todo-time-add"
                  onClick={() => {
                    setHasTime(true);
                    setTime("09:00");
                  }}
                >
                  Add time
                </button>
              )}
            </div>
          </div>
          )}

          {!undated && (
          <div className="field todo-repeat-field">
            <div className="field-label-row">
              <span className="field-label">Repeat</span>
              <div
                className="todo-repeat-toggle compact"
                role="group"
                aria-label="Repeat"
              >
                <button
                  type="button"
                  className={!repeats ? "todo-repeat-seg on" : "todo-repeat-seg"}
                  aria-pressed={!repeats}
                  disabled={busy}
                  onClick={setRepeatsNo}
                >
                  No
                </button>
                <button
                  type="button"
                  className={repeats ? "todo-repeat-seg on" : "todo-repeat-seg"}
                  aria-pressed={repeats}
                  disabled={busy}
                  onClick={setRepeatsYes}
                >
                  Yes
                </button>
              </div>
            </div>
            {repeats && (
              <button
                type="button"
                className="todo-repeat-summary"
                disabled={busy}
                onClick={openCustomSheet}
              >
                <span>{schedulePreview || "Set schedule"}</span>
                <span className="todo-repeat-summary-edit">Edit</span>
              </button>
            )}
          </div>
          )}

          {!undated && (
          <div className="field todo-repeat-field">
            <div className="field-label-row">
              <span className="field-label">Track over time</span>
              <div
                className="todo-repeat-toggle compact"
                role="group"
                aria-label="Track over time"
              >
                <button
                  type="button"
                  className={!trackOverTime ? "todo-repeat-seg on" : "todo-repeat-seg"}
                  aria-pressed={!trackOverTime}
                  disabled={busy}
                  onClick={() => setTrackOverTime(false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className={trackOverTime ? "todo-repeat-seg on" : "todo-repeat-seg"}
                  aria-pressed={trackOverTime}
                  disabled={busy}
                  onClick={() => {
                    setTrackOverTime(true);
                    // Tracking only applies to repeating tasks — flip Repeat on.
                    if (!repeats) setRepeatsYes();
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
          )}

          {error && (
            <p className="tiny" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          )}

          {onDelete && (
            <button
              type="button"
              className="todo-delete-link"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Delete task
            </button>
          )}

          <div className="todo-composer-actions">
            <SecondaryButton onClick={onCancel} disabled={busy}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={() => void submit()}
              disabled={busy || !label.trim() || !group}
            >
              {busy ? "Saving…" : (submitLabel ?? (initial ? "Save" : "Add"))}
            </PrimaryButton>
          </div>
        </div>
      </Sheet>

      {customOpen && (
        <CustomRecurrenceSheet
          today={today}
          dueDate={date || today}
          fields={customFields}
          busy={busy}
          onChange={setCustomFields}
          onDone={() => setCustomOpen(false)}
          onCancel={() => setCustomOpen(false)}
        />
      )}
    </>
  );
}

export function SnoozeUntilPicker({
  today,
  busy,
  onPick,
  onCancel,
}: {
  today: string;
  busy: boolean;
  onPick: (until: string) => void;
  onCancel: () => void;
}) {
  const tomorrow = addDays(today, 1);
  const [until, setUntil] = useState(tomorrow);
  return (
    <div className="todo-snooze-until fade-in">
      <label className="field" style={{ marginBottom: 8 }}>
        <span className="field-label">Snooze until</span>
        <input
          type="date"
          value={until}
          min={tomorrow}
          onChange={(e) => setUntil(e.target.value)}
        />
      </label>
      <div className="todo-composer-actions">
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={() => onPick(until)}
          disabled={busy || until <= today}
        >
          Snooze
        </PrimaryButton>
      </div>
    </div>
  );
}
