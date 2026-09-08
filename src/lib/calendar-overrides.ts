import type { RebuildState } from "./types";
import type { TaskGroup } from "./task-groups";
import { optionalTaskGroup, parseTaskGroup } from "./task-groups";
import type { WorkCalendarEvent } from "./work-calendar";

const TITLE_MAX = 120;

/** Local display title overrides for calendar events (keyed by stable event id). */
export function calendarTitleOverrides(
  state: RebuildState,
): Record<string, string> {
  return state.calendarTitleOverrides ?? {};
}

export function calendarEventGroups(
  state: RebuildState,
): Record<string, TaskGroup> {
  return state.calendarEventGroups ?? {};
}

export function displayCalendarTitle(
  event: WorkCalendarEvent,
  overrides: Record<string, string>,
): string {
  const custom = overrides[event.id]?.trim();
  return custom || event.title;
}

export function applyCalendarTitleOverrides(
  events: WorkCalendarEvent[],
  overrides: Record<string, string>,
): WorkCalendarEvent[] {
  if (!Object.keys(overrides).length) return events;
  return events.map((ev) => {
    const title = displayCalendarTitle(ev, overrides);
    return title === ev.title ? ev : { ...ev, title };
  });
}

export function setCalendarTitleOverride(
  state: RebuildState,
  eventId: string,
  title: string,
): RebuildState {
  const id = String(eventId || "").trim();
  if (!id) return state;

  const next = { ...(state.calendarTitleOverrides ?? {}) };
  const trimmed = title.trim().slice(0, TITLE_MAX);

  if (!trimmed) {
    delete next[id];
  } else {
    next[id] = trimmed;
  }

  return {
    ...state,
    calendarTitleOverrides: Object.keys(next).length ? next : undefined,
  };
}

export function setCalendarEventGroup(
  state: RebuildState,
  eventId: string,
  group: TaskGroup,
): RebuildState {
  const id = String(eventId || "").trim();
  if (!id) return state;
  const next = { ...(state.calendarEventGroups ?? {}) };
  next[id] = parseTaskGroup(group);
  return { ...state, calendarEventGroups: next };
}

export function eventGroupOverride(
  state: RebuildState,
  eventId: string,
): TaskGroup | undefined {
  return optionalTaskGroup(calendarEventGroups(state)[eventId]);
}

/** Event ids hidden on Home (feed can lag after phone deletes). */
export function calendarHiddenEventIds(state: RebuildState): Set<string> {
  return new Set(state.calendarHiddenEventIds ?? []);
}

export function filterHiddenCalendarEvents(
  events: WorkCalendarEvent[],
  hidden: Set<string>,
): WorkCalendarEvent[] {
  if (!hidden.size) return events;
  return events.filter((ev) => !hidden.has(ev.id));
}

export function hideCalendarEvent(
  state: RebuildState,
  eventId: string,
): RebuildState {
  const id = String(eventId || "").trim();
  if (!id) return state;
  const prev = state.calendarHiddenEventIds ?? [];
  if (prev.includes(id)) return state;
  return {
    ...state,
    calendarHiddenEventIds: [...prev, id],
  };
}
