"use client";

import {
  TASK_GROUPS,
  TASK_GROUP_COLORS,
  TASK_GROUP_LABELS,
  TASK_GROUP_SHORT_LABELS,
  type TaskGroup,
} from "@/lib/task-groups";

export function TaskGroupPicker({
  value,
  onChange,
  required = true,
  id = "task-group",
}: {
  value: TaskGroup | "";
  onChange: (group: TaskGroup) => void;
  required?: boolean;
  id?: string;
}) {
  return (
    <fieldset className="task-group-picker" id={id}>
      <legend className="field-label">Group</legend>
      <div className="task-group-options" role="radiogroup" aria-label="Group">
        {TASK_GROUPS.map((group) => {
          const selected = value === group;
          return (
            <button
              key={group}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={TASK_GROUP_LABELS[group]}
              className={`task-group-option${selected ? " selected" : ""}`}
              style={{ ["--group-color" as string]: TASK_GROUP_COLORS[group] }}
              onClick={() => onChange(group)}
            >
              <span className="task-group-swatch" aria-hidden />
              {TASK_GROUP_SHORT_LABELS[group]}
            </button>
          );
        })}
      </div>
      {required && !value ? (
        <p className="tiny muted" style={{ margin: "6px 0 0" }}>
          Required
        </p>
      ) : null}
    </fieldset>
  );
}
