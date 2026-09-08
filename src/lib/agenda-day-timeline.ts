import { parseAgendaDisplayTimeToMinutes } from "./agenda-past";

/** Home calendar day spine: 8:00 AM – 9:00 PM local (Jeremy profile / EST). */
export const DAY_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 21 * 60; // 9:00 PM

/** Collapse empty stretches at or above this length (minutes). */
export const COLLAPSE_EMPTY_MINUTES = 45;

export type TimedAgendaEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
};

export type TimelineEventBlock = {
  kind: "event";
  startMin: number;
  endMin: number;
  event: TimedAgendaEvent;
};

export type TimelineGapBlock = {
  kind: "gap";
  startMin: number;
  endMin: number;
  /** Collapsed by default when long enough */
  collapsed: boolean;
};

export type TimelineBlock = TimelineEventBlock | TimelineGapBlock;

export function formatTimelineHour(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  if (m === 0) return `${h} ${ap}`;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

export function formatGapLabel(startMin: number, endMin: number): string {
  const mins = Math.max(0, endMin - startMin);
  if (mins < 60) return `${mins}m open`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return hours === 1 ? "1h open" : `${hours}h open`;
  return `${hours}h ${rem}m open`;
}

export function isAllDayLike(event: TimedAgendaEvent): boolean {
  return (
    Boolean(event.allDay) ||
    event.startTime === "All day" ||
    event.startTime === "Anytime"
  );
}

function eventWindow(event: TimedAgendaEvent): {
  startMin: number;
  endMin: number;
} | null {
  if (isAllDayLike(event)) return null;
  const startMin = parseAgendaDisplayTimeToMinutes(event.startTime);
  if (startMin == null) return null;
  const endRaw = event.endTime?.trim()
    ? parseAgendaDisplayTimeToMinutes(event.endTime)
    : null;
  let endMin = endRaw ?? startMin + 30;
  if (endMin <= startMin) endMin = startMin + 30;
  return { startMin, endMin };
}

/**
 * Build an 8am–9pm day timeline: timed events in order, long empty stretches collapsed.
 * Events overlapping the window are clamped into view.
 */
export function buildDayTimeline(
  events: TimedAgendaEvent[],
  opts?: {
    dayStart?: number;
    dayEnd?: number;
    collapseAfter?: number;
  },
): { allDay: TimedAgendaEvent[]; blocks: TimelineBlock[] } {
  const dayStart = opts?.dayStart ?? DAY_START_MINUTES;
  const dayEnd = opts?.dayEnd ?? DAY_END_MINUTES;
  const collapseAfter = opts?.collapseAfter ?? COLLAPSE_EMPTY_MINUTES;

  const allDay = events.filter(isAllDayLike);
  const timed = events
    .map((event) => {
      const win = eventWindow(event);
      if (!win) return null;
      if (win.endMin <= dayStart || win.startMin >= dayEnd) return null;
      const startMin = Math.max(dayStart, win.startMin);
      const endMin = Math.max(startMin + 15, Math.min(dayEnd, win.endMin));
      return { event, startMin, endMin };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        a.endMin - b.endMin ||
        a.event.title.localeCompare(b.event.title),
    );

  if (timed.length === 0) {
    return {
      allDay,
      blocks: [
        {
          kind: "gap",
          startMin: dayStart,
          endMin: dayEnd,
          collapsed: true,
        },
      ],
    };
  }

  const blocks: TimelineBlock[] = [];
  let cursor = dayStart;

  for (const row of timed) {
    if (row.startMin > cursor) {
      const span = row.startMin - cursor;
      blocks.push({
        kind: "gap",
        startMin: cursor,
        endMin: row.startMin,
        collapsed: span >= collapseAfter,
      });
    }
    blocks.push({
      kind: "event",
      startMin: row.startMin,
      endMin: row.endMin,
      event: row.event,
    });
    cursor = Math.max(cursor, row.endMin);
  }

  if (cursor < dayEnd) {
    const span = dayEnd - cursor;
    blocks.push({
      kind: "gap",
      startMin: cursor,
      endMin: dayEnd,
      collapsed: span >= collapseAfter,
    });
  }

  return { allDay, blocks };
}

/** Soft height for event blocks — short meetings stay tappable. */
export function eventBlockHeightPx(startMin: number, endMin: number): number {
  const mins = Math.max(15, endMin - startMin);
  return Math.round(Math.min(168, Math.max(48, mins * 1.15)));
}
