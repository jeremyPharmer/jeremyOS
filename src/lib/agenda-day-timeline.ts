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

export type TimelineEventLane = {
  startMin: number;
  endMin: number;
  event: TimedAgendaEvent;
  /** 0-based column within the overlap cluster */
  column: number;
  /** Total columns in this cluster (≥1) */
  columns: number;
};

export type TimelineEventBlock = {
  kind: "event";
  startMin: number;
  endMin: number;
  event: TimedAgendaEvent;
};

/** Overlapping events laid side-by-side in columns. */
export type TimelineClusterBlock = {
  kind: "cluster";
  startMin: number;
  endMin: number;
  lanes: TimelineEventLane[];
};

export type TimelineGapBlock = {
  kind: "gap";
  startMin: number;
  endMin: number;
  /** Collapsed by default when long enough */
  collapsed: boolean;
};

export type TimelineBlock =
  | TimelineEventBlock
  | TimelineClusterBlock
  | TimelineGapBlock;

type TimedRow = {
  event: TimedAgendaEvent;
  startMin: number;
  endMin: number;
};

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

/** Minutes from midnight → HTML time input value (`HH:MM`). */
export function minutesToTimeInput(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Prefill for “Add event” in an open gap: start at gap start,
 * end at +30m (or gap end when the open stretch is shorter).
 */
export function suggestGapEventTimes(
  startMin: number,
  endMin: number,
): { startTime: string; endTime: string } {
  const start = Math.max(0, Math.min(startMin, endMin));
  const gapEnd = Math.max(start, endMin);
  const preferredEnd = Math.min(gapEnd, start + 30);
  const end = preferredEnd > start ? preferredEnd : Math.min(gapEnd, start + 15);
  return {
    startTime: minutesToTimeInput(start),
    endTime: minutesToTimeInput(end),
  };
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

/** Greedy column assign — first free lane that does not overlap. */
export function assignOverlapColumns(rows: TimedRow[]): TimelineEventLane[] {
  const columnEnds: number[] = [];
  const lanes: TimelineEventLane[] = rows.map((row) => {
    let column = columnEnds.findIndex((end) => end <= row.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(row.endMin);
    } else {
      columnEnds[column] = row.endMin;
    }
    return {
      startMin: row.startMin,
      endMin: row.endMin,
      event: row.event,
      column,
      columns: 0,
    };
  });
  const columns = Math.max(1, columnEnds.length);
  return lanes.map((lane) => ({ ...lane, columns }));
}

/**
 * Group sorted timed rows into non-overlapping singles or overlap clusters.
 * A cluster is a transitive overlap set (Google Calendar–style columns).
 */
export function packTimedBlocks(rows: TimedRow[]): Array<
  TimelineEventBlock | TimelineClusterBlock
> {
  if (rows.length === 0) return [];

  const out: Array<TimelineEventBlock | TimelineClusterBlock> = [];
  let cluster: TimedRow[] = [];
  let clusterEnd = -1;

  function flush() {
    if (cluster.length === 0) return;
    if (cluster.length === 1) {
      const only = cluster[0]!;
      out.push({
        kind: "event",
        startMin: only.startMin,
        endMin: only.endMin,
        event: only.event,
      });
    } else {
      const startMin = Math.min(...cluster.map((r) => r.startMin));
      const endMin = Math.max(...cluster.map((r) => r.endMin));
      out.push({
        kind: "cluster",
        startMin,
        endMin,
        lanes: assignOverlapColumns(cluster),
      });
    }
    cluster = [];
    clusterEnd = -1;
  }

  for (const row of rows) {
    if (cluster.length === 0) {
      cluster = [row];
      clusterEnd = row.endMin;
      continue;
    }
    if (row.startMin < clusterEnd) {
      cluster.push(row);
      clusterEnd = Math.max(clusterEnd, row.endMin);
    } else {
      flush();
      cluster = [row];
      clusterEnd = row.endMin;
    }
  }
  flush();
  return out;
}

/**
 * Build an 8am–9pm day timeline: timed events in order, long empty stretches collapsed.
 * Overlapping events become side-by-side clusters. Events outside the window are clamped.
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
    .filter((row): row is TimedRow => row != null)
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

  const packed = packTimedBlocks(timed);
  const blocks: TimelineBlock[] = [];
  let cursor = dayStart;

  for (const block of packed) {
    if (block.startMin > cursor) {
      const span = block.startMin - cursor;
      blocks.push({
        kind: "gap",
        startMin: cursor,
        endMin: block.startMin,
        collapsed: span >= collapseAfter,
      });
    }
    blocks.push(block);
    cursor = Math.max(cursor, block.endMin);
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

/** Soft height for solo event blocks — short meetings stay tappable. */
export function eventBlockHeightPx(startMin: number, endMin: number): number {
  const mins = Math.max(15, endMin - startMin);
  return Math.round(Math.min(168, Math.max(48, mins * 1.15)));
}

/** Time-scaled height for an overlap cluster band. */
export function clusterBlockHeightPx(startMin: number, endMin: number): number {
  const mins = Math.max(30, endMin - startMin);
  return Math.round(Math.min(320, Math.max(96, mins * 1.35)));
}

/** Absolute placement of one lane inside a cluster band. */
export function laneStyle(
  lane: TimelineEventLane,
  clusterStart: number,
  clusterEnd: number,
  clusterHeight: number,
): {
  top: number;
  height: number;
  left: string;
  width: string;
} {
  const span = Math.max(1, clusterEnd - clusterStart);
  const top = ((lane.startMin - clusterStart) / span) * clusterHeight;
  const rawH = ((lane.endMin - lane.startMin) / span) * clusterHeight;
  // Keep enough height for a time label; 2px gutter between abutting cards
  const height = Math.max(40, rawH - 2);
  const gapPct = lane.columns > 1 ? 1.2 : 0;
  const widthPct = 100 / lane.columns - gapPct;
  const leftPct =
    (lane.column / lane.columns) * 100 + (lane.columns > 1 ? gapPct / 2 : 0);
  return {
    top: Math.round(top),
    height: Math.round(height),
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

/** Compact range for narrow overlap chips, e.g. `3:30–5:30p`. */
export function formatCompactRange(startMin: number, endMin: number): string {
  const fmt = (minutes: number, withAp: boolean) => {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
    const h24 = Math.floor(clamped / 60);
    const m = clamped % 60;
    const ap = h24 >= 12 ? "p" : "a";
    let h = h24 % 12;
    if (h === 0) h = 12;
    const core = m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
    return withAp ? `${core}${ap}` : core;
  };
  const startPm = Math.floor(startMin / 60) >= 12;
  const endPm = Math.floor(endMin / 60) >= 12;
  if (startPm === endPm) {
    return `${fmt(startMin, false)}–${fmt(endMin, true)}`;
  }
  return `${fmt(startMin, true)}–${fmt(endMin, true)}`;
}

/**
 * Overlap chip density — always include time; add title when there is room.
 */
export type LaneDensity = "time" | "time-title";

export function laneDensity(
  heightPx: number,
  columns: number,
): LaneDensity {
  if (heightPx < 56 || (columns >= 3 && heightPx < 72)) return "time";
  return "time-title";
}
