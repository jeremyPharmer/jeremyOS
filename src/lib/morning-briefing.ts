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

export type MorningBriefing = {
  feeling: string;
  weather: string;
  calendar: string;
  tasks: string;
  freeTime: string;
  suggestions: GapSuggestion[];
  /** Ordered paragraphs for the post-check-in screen. */
  paragraphs: string[];
};

/** Clamp morning metric to integer 1–10. */
export function clampMorningScore(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function feelingParagraph(scores: BriefingScores): string {
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

function weatherParagraph(weather: BriefingWeather): string {
  if (!weather) return "Weather isn’t loaded yet — check the Home strip when you’re out.";
  const precip =
    weather.precipChancePct >= 40
      ? ` About ${weather.precipChancePct}% chance of rain.`
      : weather.precipChancePct >= 20
        ? ` A little rain possible (${weather.precipChancePct}%).`
        : "";
  return `Outside: ${weather.label.toLowerCase()}, high ${weather.highF}° / low ${weather.lowF}°.${precip}`;
}

function calendarParagraph(events: BriefingEvent[]): string {
  if (events.length === 0) {
    return "Calendar is clear — no timed holds on the books.";
  }
  const allDay = events.filter((e) => e.allDay || e.startTime === "All day");
  const timed = events.filter((e) => !e.allDay && e.startTime !== "All day");
  const parts: string[] = [];
  if (timed.length > 0) {
    const shown = timed.slice(0, 4).map((e) => {
      const when = e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime;
      return `${e.title} (${when})`;
    });
    const more = timed.length > 4 ? ` · +${timed.length - 4} more` : "";
    parts.push(`On the calendar: ${shown.join("; ")}${more}.`);
  }
  if (allDay.length > 0) {
    parts.push(
      `All day: ${allDay
        .slice(0, 3)
        .map((e) => e.title)
        .join(", ")}${allDay.length > 3 ? ` +${allDay.length - 3}` : ""}.`,
    );
  }
  return parts.join(" ");
}

function tasksParagraph(tasks: BriefingTask[]): string {
  const todayTasks = tasks.filter((t) => !t.snoozedAhead);
  const snoozed = tasks.filter((t) => t.snoozedAhead);
  if (todayTasks.length === 0 && snoozed.length === 0) {
    return "Task list is clear for today.";
  }
  const parts: string[] = [];
  if (todayTasks.length > 0) {
    const names = todayTasks
      .slice(0, 5)
      .map((t) => t.label)
      .join(", ");
    const more =
      todayTasks.length > 5 ? ` (+${todayTasks.length - 5} more)` : "";
    parts.push(
      todayTasks.length === 1
        ? `One open task today: ${names}.`
        : `${todayTasks.length} open tasks today: ${names}${more}.`,
    );
  }
  if (snoozed.length > 0) {
    const names = snoozed
      .slice(0, 3)
      .map((t) => t.label)
      .join(", ");
    parts.push(
      snoozed.length === 1
        ? `Still pushed out: ${names}.`
        : `${snoozed.length} still snoozed ahead: ${names}${
            snoozed.length > 3 ? "…" : ""
          }.`,
    );
  }
  return parts.join(" ");
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

function freeTimeParagraph(gaps: OpenGap[]): string {
  if (gaps.length === 0) {
    return "The day looks packed from 8 AM to 9 PM — little open runway.";
  }
  const top = gaps.slice(0, 3).map((g) => {
    const span =
      g.minutes >= 60
        ? `${Math.round(g.minutes / 60)}h`
        : `${g.minutes}m`;
    return `${formatTimelineHour(g.startMin)}–${formatTimelineHour(g.endMin)} (${span})`;
  });
  if (gaps.length === 1) {
    return `Open time: ${top[0]}.`;
  }
  return `Biggest open stretches: ${top.join("; ")}.`;
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
    // Prefer snoozed-ahead, then untimed floating work.
    const score = (t: BriefingTask) =>
      (t.snoozedAhead ? 2 : 0) + (t.time ? 0 : 1);
    return score(b) - score(a) || a.label.localeCompare(b.label);
  });
  const out: GapSuggestion[] = [];
  const usedGaps = new Set<number>();
  for (const task of candidates) {
    if (out.length >= limit) break;
    if (task.time) continue; // already has a clock time
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

export function buildMorningBriefing(input: {
  scores: BriefingScores;
  weather: BriefingWeather;
  events: BriefingEvent[];
  tasks: BriefingTask[];
}): MorningBriefing {
  const gaps = openGapsFromEvents(input.events);
  const feeling = feelingParagraph(input.scores);
  const weather = weatherParagraph(input.weather);
  const calendar = calendarParagraph(input.events);
  const tasks = tasksParagraph(input.tasks);
  const freeTime = freeTimeParagraph(gaps);
  const suggestions = suggestTasksForGaps(input.tasks, gaps);

  const paragraphs = [feeling, weather, calendar, tasks, freeTime];
  if (suggestions.length > 0) {
    const lines = suggestions.map(
      (s) =>
        `${s.gapLabel} looks open — good window for “${s.taskLabel}”.`,
    );
    paragraphs.push(lines.join(" "));
  }

  return {
    feeling,
    weather,
    calendar,
    tasks,
    freeTime,
    suggestions,
    paragraphs,
  };
}
