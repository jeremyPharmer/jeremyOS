"use client";

import { useState } from "react";
import { SecondaryButton, Sheet } from "@/components/ui";

export function WorkoutActionsMenu({
  label,
  onEdit,
  onDelete,
  className,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`workout-history-menu${className ? ` ${className}` : ""}`}
        aria-label={`Options for ${label}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>
      {open && (
        <Sheet
          label={`Options for ${label}`}
          busy={busy}
          onClose={() => !busy && setOpen(false)}
        >
          <div className="workout-actions-sheet fade-in">
            <p className="eyebrow">Workout</p>
            <p className="tiny workout-actions-sheet-label">{label}</p>
            <button
              type="button"
              className="todo-snooze-option"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <span className="todo-snooze-option-title">Edit</span>
              <span className="todo-snooze-option-meta">
                Change details and save
              </span>
            </button>
            <button
              type="button"
              className="todo-snooze-option workout-actions-delete"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await onDelete();
                    setOpen(false);
                  } catch {
                    setBusy(false);
                  }
                })();
              }}
            >
              <span className="todo-snooze-option-title">Delete</span>
              <span className="todo-snooze-option-meta">
                Remove this workout
              </span>
            </button>
            <SecondaryButton onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </SecondaryButton>
          </div>
        </Sheet>
      )}
    </>
  );
}
