"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton, Sheet } from "@/components/ui";
import { TaskGroupPicker } from "@/components/TaskGroupPicker";
import { CUSTOM_AGENDA_TITLE_MAX } from "@/lib/custom-agenda-shared";
import type { TaskGroup } from "@/lib/task-groups";

export type AgendaEventPayload = {
  title: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  group: TaskGroup;
};

export function AgendaEventComposer({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (payload: AgendaEventPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [group, setGroup] = useState<TaskGroup | "">("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !group) return;
    await onSubmit({
      title: trimmed,
      allDay,
      startTime: allDay ? undefined : startTime || undefined,
      endTime: allDay ? undefined : endTime || undefined,
      group,
    });
    setTitle("");
    setAllDay(false);
    setStartTime("");
    setEndTime("");
    setGroup("");
  }

  return (
    <Sheet label="New event" busy={busy} onClose={onCancel}>
      <form
        className="agenda-add-form fade-in"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p className="eyebrow">New event</p>
        <label className="field">
          <span className="field-label">What</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder or event"
            maxLength={CUSTOM_AGENDA_TITLE_MAX}
          />
        </label>
        <TaskGroupPicker value={group} onChange={setGroup} />
        <label className="check-inline agenda-add-allday">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        {!allDay && (
          <div className="agenda-add-times">
            <label className="field">
              <span className="field-label">Start</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">End</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="agenda-add-actions">
          <SecondaryButton type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            disabled={busy || !title.trim() || !group}
          >
            {busy ? "Adding…" : "Add"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
