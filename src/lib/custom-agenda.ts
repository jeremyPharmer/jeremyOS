import { newId } from "./journey";
import { CUSTOM_AGENDA_NOTE_MAX, CUSTOM_AGENDA_TITLE_MAX } from "./custom-agenda-shared";
import { parseTaskGroup, type TaskGroup } from "./task-groups";
import type { CustomAgendaEvent, RebuildState } from "./types";
import { sortAgenda, type WorkCalendarEvent } from "./work-calendar";

export { CUSTOM_AGENDA_NOTE_MAX, CUSTOM_AGENDA_TITLE_MAX, isCustomAgendaId } from "./custom-agenda-shared";

export function customAgendaEvents(state: RebuildState): CustomAgendaEvent[] {
  return state.customAgendaEvents ?? [];
}

export function customEventsForDay(
  state: RebuildState,
  date: string,
): CustomAgendaEvent[] {
  return customAgendaEvents(state).filter((ev) => ev.date === date);
}

/** Convert HTML time input (HH:MM) to display label like "3:00 PM". */
export function formatAgendaTimeInput(hhmm: string): string | undefined {
  const trimmed = hhmm.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }
  const d = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Parse display time back to HH:MM for time inputs. */
export function agendaTimeInputValue(label?: string): string {
  if (!label) return "";
  const d = Date.parse(`1970-01-01 ${label}`);
  if (Number.isNaN(d)) return "";
  const date = new Date(d);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function customToWorkCalendarEvent(
  ev: CustomAgendaEvent,
): WorkCalendarEvent {
  const allDay = Boolean(ev.allDay);
  return {
    id: ev.id,
    title: ev.title,
    startTime: allDay ? "All day" : ev.startTime || "Anytime",
    endTime: allDay ? undefined : ev.endTime,
    allDay,
    location: ev.note?.trim() || undefined,
    source: "custom",
    group: ev.group,
  };
}

export function mergeAgendaEvents(
  feedEvents: WorkCalendarEvent[],
  custom: CustomAgendaEvent[],
): WorkCalendarEvent[] {
  return sortAgenda([
    ...feedEvents,
    ...custom.map(customToWorkCalendarEvent),
  ]);
}

export function addCustomAgendaEvent(
  state: RebuildState,
  input: {
    date: string;
    title: string;
    allDay?: boolean;
    startTime?: string;
    endTime?: string;
    note?: string;
    group: TaskGroup;
  },
): RebuildState {
  const title = input.title.trim().slice(0, CUSTOM_AGENDA_TITLE_MAX);
  if (!title) return state;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return state;
  const group = parseTaskGroup(input.group);

  const allDay = Boolean(input.allDay);
  const startTime = allDay ? undefined : input.startTime?.trim() || undefined;
  const endTime = allDay ? undefined : input.endTime?.trim() || undefined;
  const note = input.note?.trim().slice(0, CUSTOM_AGENDA_NOTE_MAX) || undefined;

  const event: CustomAgendaEvent = {
    id: `custom:${newId("agenda")}`,
    date: input.date,
    title,
    allDay: allDay || undefined,
    startTime,
    endTime,
    note,
    group,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    customAgendaEvents: [...customAgendaEvents(state), event],
  };
}

export function updateCustomAgendaEvent(
  state: RebuildState,
  id: string,
  patch: {
    title?: string;
    allDay?: boolean;
    startTime?: string;
    endTime?: string;
    note?: string;
    group?: TaskGroup;
  },
): RebuildState {
  const events = customAgendaEvents(state);
  const idx = events.findIndex((ev) => ev.id === id);
  if (idx < 0) return state;

  const current = events[idx];
  const nextTitle =
    patch.title !== undefined
      ? patch.title.trim().slice(0, CUSTOM_AGENDA_TITLE_MAX)
      : current.title;
  if (!nextTitle) return removeCustomAgendaEvent(state, id);

  const allDay =
    patch.allDay !== undefined ? patch.allDay : Boolean(current.allDay);
  const startTime =
    patch.startTime !== undefined
      ? patch.startTime.trim() || undefined
      : current.startTime;
  const endTime =
    patch.endTime !== undefined
      ? patch.endTime.trim() || undefined
      : current.endTime;
  const note =
    patch.note !== undefined
      ? patch.note.trim().slice(0, CUSTOM_AGENDA_NOTE_MAX) || undefined
      : current.note;
  const group =
    patch.group !== undefined ? parseTaskGroup(patch.group) : current.group;

  const updated: CustomAgendaEvent = {
    ...current,
    title: nextTitle,
    allDay: allDay || undefined,
    startTime: allDay ? undefined : startTime,
    endTime: allDay ? undefined : endTime,
    note,
    group,
  };

  const next = [...events];
  next[idx] = updated;
  return { ...state, customAgendaEvents: next };
}

export function removeCustomAgendaEvent(
  state: RebuildState,
  id: string,
): RebuildState {
  const next = customAgendaEvents(state).filter((ev) => ev.id !== id);
  return {
    ...state,
    customAgendaEvents: next.length ? next : undefined,
  };
}
