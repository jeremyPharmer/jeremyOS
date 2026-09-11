import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  buildDayTimeline,
  formatTimelineHour,
  type TimedAgendaEvent,
} from "./agenda-day-timeline";

export type BriefingScores = {
  sleepHours: number;
  sleepQuality: number;
  mood: number;
  energy: number;
  stress: number;
};

export type BriefingWeather = {
  label: string;
  highF: number;
  lowF: number;
  precipChancePct: number;
} | null;

export type BriefingEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
};

export type BriefingTask = {
  id: string;
  label: string;
  /** HH:mm when timed; omit for date-only / floating. */
  time?: string;
  /** True when the item is due after today (snoozed ahead). */
  snoozedAhead?: boolean;
};

export type GapSuggestion = {
  taskId: string;
  taskLabel: string;
  gapLabel: string;
};

export type BriefingSection = {
  key: string;
  label: string;
  body?: string;
  items?: string[];
};

export type MorningBriefing = {
  feeling: string;
  weather: string;
  calendar: string;
  tasks: string;
  freeTime: string;
  suggestions: GapSuggestion[];
  /** Soft one-liner: how you feel + weather (secondary). */
  opener: string;
  /** Conversational calendar lead + event lines. */
  calendarStory: { lead: string; items: string[] };
  /** Open windows + task placement — co-primary with calendar. */
  planStory: { lead: string; items: string[] };
  /** Light aside for leftover tasks not placed into a window. */
  leftoverNote?: string;
  sections: BriefingSection[];
  /** @deprecated prefer narrative fields / sections */
  paragraphs: string[];
};

/** Clamp morning metric to integer 1–10. */
export function clampMorningScore(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function feelingBody(scores: BriefingScores): string {
  const { sleepHours, sleepQuality, mood, energy, stress } = scores;
  const rested = (sleepHours + sleepQuality) / 2;
  const bits: string[] = [];

  if (rested >= 7) bits.push("Sleep looks solid");
  else if (rested <= 4) bits.push("Sleep was thin");
  else bits.push("Sleep was okay");

  if (mood >= 7 && energy >= 7) {
    bits.push("mood and energy are both up");
  } else if (mood <= 4 && energy <= 4) {
    bits.push("mood and energy are both low — go gentle");
  } else if (energy <= 4) {
    bits.push("energy is low");
  } else if (mood <= 4) {
    bits.push("mood is soft");
  } else if (mood >= 7) {
    bits.push("mood is good");
  } else if (energy >= 7) {
    bits.push("energy is good");
  } else {
    bits.push("you're in a middle gear");
  }

  if (stress >= 7) bits.push("stress is elevated");
  else if (stress <= 3) bits.push("stress is quiet");

  const lead = bits[0]!;
  const rest = bits.slice(1);
  if (rest.length === 0) return `${lead}.`;
  if (rest.length === 1) return `${lead}, and ${rest[0]}.`;
  return `${lead}; ${rest.slice(0, -1).join("; ")}; and ${rest[rest.length - 1]}.`;
}

function weatherBody(weather: BriefingWeather): string {
  if (!weather) return "Not loaded yet — check Home when you’re out.";
  const precip =
    weather.precipChancePct >= 40
      ? ` About ${weather.precipChancePct}% chance of rain.`
      : weather.precipChancePct >= 20
        ? ` A little rain possible (${weather.precipChancePct}%).`
        : "";
  return `${weather.label}, ${weather.highF}° / ${weather.lowF}°.${precip}`;
}

function calendarItems(events: BriefingEvent[]): {
  body?: string;
  items?: string[];
} {
  if (events.length === 0) {
    return { body: "Clear — nothing timed on the books." };
  }
  const allDay = events.filter((e) => e.allDay || e.startTime === "All day");
  const timed = events.filter((e) => !e.allDay && e.startTime !== "All day");
  const items: string[] = [];
  for (const e of timed.slice(0, 6)) {
    const when = e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime;
    items.push(`${when} · ${e.title}`);
  }
  if (timed.length > 6) items.push(`+${timed.length - 6} more`);
  for (const e of allDay.slice(0, 3)) {
    items.push(`All day · ${e.title}`);
  }
  if (allDay.length > 3) items.push(`+${allDay.length - 3} more all-day`);
  return { items };
}

function tasksSection(tasks: BriefingTask[]): {
  body?: string;
  items?: string[];
} {
  const todayTasks = tasks.filter((t) => !t.snoozedAhead);
  const snoozed = tasks.filter((t) => t.snoozedAhead);
  if (todayTasks.length === 0 && snoozed.length === 0) {
    return { body: "Nothing open for today." };
  }
  const items: string[] = [];
  for (const t of todayTasks.slice(0, 5)) {
    items.push(t.time ? `${t.label} · ${t.time}` : t.label);
  }
  if (todayTasks.length > 5) items.push(`+${todayTasks.length - 5} more today`);
  for (const t of snoozed.slice(0, 3)) {
    items.push(`Snoozed · ${t.label}`);
  }
  if (snoozed.length > 3) items.push(`+${snoozed.length - 3} still pushed out`);
  return { items };
}

type OpenGap = { startMin: number; endMin: number; minutes: number };

function openGapsFromEvents(events: BriefingEvent[]): OpenGap[] {
  const timed: TimedAgendaEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
  }));
  const { blocks } = buildDayTimeline(timed, {
    dayStart: DAY_START_MINUTES,
    dayEnd: DAY_END_MINUTES,
  });
  return blocks
    .filter((b) => b.kind === "gap")
    .map((b) => ({
      startMin: b.startMin,
      endMin: b.endMin,
      minutes: b.endMin - b.startMin,
    }))
    .filter((g) => g.minutes >= 30)
    .sort((a, b) => b.minutes - a.minutes);
}

function freeTimeSection(gaps: OpenGap[]): {
  body?: string;
  items?: string[];
} {
  if (gaps.length === 0) {
    return { body: "Packed from 8 AM to 9 PM — little open runway." };
  }
  const items = gaps.slice(0, 4).map(
    (g) =>
      `${formatTimelineHour(g.startMin)}–${formatTimelineHour(g.endMin)}`,
  );
  return { items };
}

function gapSpanWords(minutes: number): string {
  if (minutes >= 150) return "a long stretch";
  if (minutes >= 90) return "a solid block";
  if (minutes >= 60) return "about an hour";
  return "a short pocket";
}

/**
 * Suggest floating / snoozed tasks into the largest open calendar gaps.
 * Does not mutate todos — briefing copy only.
 */
export function suggestTasksForGaps(
  tasks: BriefingTask[],
  gaps: OpenGap[],
  limit = 3,
): GapSuggestion[] {
  if (gaps.length === 0 || tasks.length === 0) return [];
  const candidates = [...tasks].sort((a, b) => {
    const score = (t: BriefingTask) =>
      (t.snoozedAhead ? 2 : 0) + (t.time ? 0 : 1);
    return score(b) - score(a) || a.label.localeCompare(b.label);
  });
  const out: GapSuggestion[] = [];
  const usedGaps = new Set<number>();
  for (const task of candidates) {
    if (out.length >= limit) break;
    if (task.time) continue;
    const gapIdx = gaps.findIndex((_, i) => !usedGaps.has(i));
    if (gapIdx < 0) break;
    usedGaps.add(gapIdx);
    const gap = gaps[gapIdx]!;
    out.push({
      taskId: task.id,
      taskLabel: task.label,
      gapLabel: `${formatTimelineHour(gap.startMin)}–${formatTimelineHour(gap.endMin)}`,
    });
  }
  return out;
}

function calendarStoryFrom(
  events: BriefingEvent[],
  cal: { body?: string; items?: string[] },
): { lead: string; items: string[] } {
  if (events.length === 0) {
    return {
      lead: "The calendar is clear — the day is yours to shape.",
      items: [],
    };
  }
  const timed = events.filter((e) => !e.allDay && e.startTime !== "All day");
  const allDay = events.filter((e) => e.allDay || e.startTime === "All day");
  const n = timed.length + allDay.length;
  const lead =
    n === 1
      ? "One thing anchors the day:"
      : n <= 3
        ? `A few anchors on the calendar (${n}):`
        : `Here’s the spine of the day — ${n} things on the books:`;
  return { lead, items: cal.items ?? [] };
}

function planStoryFrom(
  gaps: OpenGap[],
  suggestions: GapSuggestion[],
): { lead: string; items: string[] } {
  if (suggestions.length > 0) {
    const lead =
      suggestions.length === 1
        ? "One open window looks useful:"
        : "Here’s where you could fit the other work:";
    return {
      lead,
      items: suggestions.map((s) => {
        const gap = gaps.find(
          (g) =>
            `${formatTimelineHour(g.startMin)}–${formatTimelineHour(g.endMin)}` ===
            s.gapLabel,
        );
        const feel = gap ? gapSpanWords(gap.minutes) : "open time";
        return `${s.gapLabel} — ${feel} for “${s.taskLabel}”.`;
      }),
    };
  }
  if (gaps.length === 0) {
    return {
      lead: "The day is packed — protect the seams between meetings.",
      items: [],
    };
  }
  return {
    lead: "Open air on the clock — nothing assigned yet:",
    items: gaps
      .slice(0, 4)
      .map(
        (g) =>
          `${formatTimelineHour(g.startMin)}–${formatTimelineHour(g.endMin)} — ${gapSpanWords(g.minutes)}.`,
      ),
  };
}

function leftoverNoteFrom(
  tasks: BriefingTask[],
  suggestions: GapSuggestion[],
): string | undefined {
  const placed = new Set(suggestions.map((s) => s.taskId));
  const todayOpen = tasks.filter((t) => !t.snoozedAhead && !t.time);
  const leftover = todayOpen.filter((t) => !placed.has(t.id));
  const timed = tasks.filter((t) => !t.snoozedAhead && t.time);
  const bits: string[] = [];
  if (timed.length > 0) {
    bits.push(
      timed.length === 1
        ? `Already timed: ${timed[0]!.label}`
        : `${timed.length} tasks already have a clock time`,
    );
  }
  if (leftover.length > 0) {
    const names = leftover
      .slice(0, 3)
      .map((t) => t.label)
      .join(", ");
    bits.push(
      leftover.length <= 3
        ? `Still loose on the list: ${names}`
        : `Still loose on the list: ${names}, +${leftover.length - 3} more`,
    );
  }
  if (bits.length === 0) return undefined;
  return bits.join(". ") + ".";
}

export function buildMorningBriefing(input: {
  scores: BriefingScores;
  weather: BriefingWeather;
  events: BriefingEvent[];
  tasks: BriefingTask[];
}): MorningBriefing {
  const gaps = openGapsFromEvents(input.events);
  const feeling = feelingBody(input.scores);
  const weather = weatherBody(input.weather);
  const cal = calendarItems(input.events);
  const taskBlock = tasksSection(input.tasks);
  const free = freeTimeSection(gaps);
  const suggestions = suggestTasksForGaps(input.tasks, gaps);

  const calendar =
    cal.body ??
    (cal.items?.length
      ? `On the calendar: ${cal.items.join("; ")}.`
      : "Calendar is clear.");
  const tasks =
    taskBlock.body ??
    (taskBlock.items?.length
      ? taskBlock.items.join("; ") + "."
      : "Task list is clear.");
  const freeTime =
    free.body ??
    (free.items?.length
      ? `Open: ${free.items.join("; ")}.`
      : "Little open time.");

  const opener = `${feeling.replace(/\.$/, "")}. ${weather}`;
  const calendarStory = calendarStoryFrom(input.events, cal);
  const planStory = planStoryFrom(gaps, suggestions);
  const leftoverNote = leftoverNoteFrom(input.tasks, suggestions);

  // Conversational board: calendar + plan first; feeling/weather only as light aside.
  const sections: BriefingSection[] = [
    {
      key: "calendar",
      label: "On the calendar",
      body: calendarStory.items.length === 0 ? calendarStory.lead : undefined,
      items:
        calendarStory.items.length > 0
          ? [calendarStory.lead, ...calendarStory.items]
          : undefined,
    },
    {
      key: "plan",
      label: "When you could do the rest",
      body: planStory.items.length === 0 ? planStory.lead : undefined,
      items:
        planStory.items.length > 0
          ? [planStory.lead, ...planStory.items]
          : undefined,
    },
  ];
  if (leftoverNote) {
    sections.push({ key: "aside", label: "Also on the list", body: leftoverNote });
  }
  sections.push({
    key: "pulse",
    label: "Quick pulse",
    body: opener,
  });

  const paragraphs = [
    calendarStory.lead,
    ...calendarStory.items,
    planStory.lead,
    ...planStory.items,
  ];
  if (leftoverNote) paragraphs.push(leftoverNote);
  paragraphs.push(opener);

  return {
    feeling,
    weather,
    calendar,
    tasks,
    freeTime,
    suggestions,
    opener,
    calendarStory,
    planStory,
    leftoverNote,
    sections,
    paragraphs,
  };
}
