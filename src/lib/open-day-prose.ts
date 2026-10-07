/**
 * Lean Open briefing copy (RB-042) — rules-based weather periods + day-ahead prose.
 * No LLM in v1.
 */

import type { DailyForecast } from "./weather";

export type WeatherPeriodPhrases = {
  morning: string;
  afternoon: string;
  evening: string;
  summary: string;
};

/** Derive morning / afternoon / evening lines from a single daily forecast. */
export function weatherPeriodPhrases(
  day: DailyForecast | null | undefined,
  locationLabel?: string,
): WeatherPeriodPhrases | null {
  if (!day) return null;
  const place = locationLabel?.trim() ? ` in ${locationLabel.trim()}` : "";
  const span = day.highF - day.lowF;
  const rainy = day.precipChancePct >= 40;
  const windy = (day.windMphMax ?? 0) >= 15;
  const sunny =
    day.code === 0 || (day.code <= 3 && day.precipChancePct < 25);

  const morningBits: string[] = [];
  morningBits.push(
    `Around ${day.lowF}° to start${place} — ${day.label.toLowerCase()}`,
  );
  if (rainy) morningBits.push("keep a rain layer handy");
  else if (sunny) morningBits.push("a clear start");

  const afternoonBits: string[] = [];
  afternoonBits.push(`High near ${day.highF}°`);
  if (day.uvIndexMax != null && day.uvIndexMax >= 6) {
    afternoonBits.push(`UV ${day.uvIndexMax}`);
  }
  if (windy) afternoonBits.push(`winds up to ${day.windMphMax} mph`);
  if (rainy) afternoonBits.push(`${day.precipChancePct}% rain chance`);
  else if (sunny && span >= 15) afternoonBits.push("warms up nicely");

  const eveningBits: string[] = [];
  eveningBits.push(`Easing back toward ${day.lowF}°`);
  if (rainy) eveningBits.push("showers still possible");
  else eveningBits.push(sunny ? "settling clear" : "staying mild");

  return {
    morning: sentence(morningBits),
    afternoon: sentence(afternoonBits),
    evening: sentence(eveningBits),
    summary: `${day.label}${place}. High ${day.highF}° / low ${day.lowF}°.`,
  };
}

function sentence(bits: string[]): string {
  if (bits.length === 0) return "";
  if (bits.length === 1) {
    const s = bits[0]!;
    return /[.!?]$/.test(s) ? s : `${s}.`;
  }
  const head = bits.slice(0, -1).join("; ");
  const last = bits[bits.length - 1]!;
  return `${head}; ${last}.`.replace(/\.\./g, ".");
}

export type DayAheadEvent = {
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
};

export type DayAheadTask = {
  label: string;
  time?: string;
};

/** Plain-English calendar + tasks for Open (rules-based). */
export function dayAheadProse(input: {
  events: DayAheadEvent[];
  tasks: DayAheadTask[];
}): string {
  const events = input.events;
  const tasks = input.tasks;
  const parts: string[] = [];

  const timed = events.filter((e) => !e.allDay && e.startTime !== "All day");
  const allDay = events.filter((e) => e.allDay || e.startTime === "All day");

  if (timed.length === 0 && allDay.length === 0) {
    parts.push("Your calendar is clear today");
  } else if (timed.length === 0 && allDay.length > 0) {
    parts.push(
      allDay.length === 1
        ? `All-day: ${allDay[0]!.title}`
        : `All-day notes: ${joinTitles(allDay.map((e) => e.title))}`,
    );
  } else {
    const first = timed[0]!;
    const last = timed[timed.length - 1]!;
    if (timed.length === 1) {
      parts.push(
        `One timed event — ${formatEvent(first)}`,
      );
    } else {
      parts.push(
        `${timed.length} timed events, from ${shortWhen(first.startTime)} through ${shortWhen(last.startTime)}`,
      );
      const highlight = timed.slice(0, 3).map(formatEvent);
      parts.push(highlight.join("; "));
      if (timed.length > 3) {
        parts.push(`plus ${timed.length - 3} more`);
      }
    }
    if (allDay.length > 0) {
      parts.push(
        allDay.length === 1
          ? `Also all-day: ${allDay[0]!.title}`
          : `Also all-day: ${joinTitles(allDay.map((e) => e.title))}`,
      );
    }
  }

  if (tasks.length === 0) {
    parts.push("No open tasks queued for today");
  } else if (tasks.length === 1) {
    parts.push(`One task on the list: ${tasks[0]!.label}`);
  } else {
    const names = tasks.slice(0, 4).map((t) => t.label);
    parts.push(
      `${tasks.length} tasks — ${joinTitles(names)}${
        tasks.length > 4 ? `, and ${tasks.length - 4} more` : ""
      }`,
    );
  }

  return parts.map((p) => (/[.!?]$/.test(p) ? p : `${p}.`)).join(" ");
}

function formatEvent(e: DayAheadEvent): string {
  return `${shortWhen(e.startTime)} ${e.title}`;
}

function shortWhen(start: string): string {
  return start.replace(/\s+/g, " ").trim();
}

function joinTitles(titles: string[]): string {
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0]!;
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

/** Clamp Open sleep quality / Close day rating to integer 1–5. */
export function clampFiveScore(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}
