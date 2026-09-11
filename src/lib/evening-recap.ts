/**
 * Rules-based evening day recap (RB-029).
 * Mirrors morning briefing posture — templated, no LLM required for v1.
 */

export type EveningRecapScores = {
  mood: number;
  stress: number;
};

export type EveningRecapEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
};

export type EveningRecapTask = {
  id: string;
  label: string;
  /** Completed for this day */
  done?: boolean;
};

export type EveningRecapSection = {
  key: string;
  label: string;
  body?: string;
  items?: string[];
};

export type EveningRecap = {
  /** Short general paragraph of the day */
  summary: string;
  sections: EveningRecapSection[];
};

function moodStressBody(scores: EveningRecapScores): string {
  const { mood, stress } = scores;
  const moodBit =
    mood >= 8
      ? "Mood landed high"
      : mood >= 6
        ? "Mood was solid"
        : mood >= 4
          ? "Mood was mixed"
          : "Mood was heavy";
  const stressBit =
    stress >= 8
      ? "stress ran hot"
      : stress >= 6
        ? "stress was elevated"
        : stress >= 4
          ? "stress was moderate"
          : "stress stayed quiet";
  return `${moodBit}, and ${stressBit}.`;
}

function intentionBody(intention: string | undefined): string | undefined {
  const t = intention?.trim();
  if (!t) return undefined;
  return `You set out to: ${t}.`;
}

function calendarSection(events: EveningRecapEvent[]): {
  body?: string;
  items?: string[];
} {
  if (events.length === 0) {
    return { body: "Nothing timed on the calendar." };
  }
  const allDay = events.filter((e) => e.allDay || e.startTime === "All day");
  const timed = events.filter((e) => !e.allDay && e.startTime !== "All day");
  const items: string[] = [];
  for (const e of timed.slice(0, 5)) {
    const when = e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime;
    items.push(`${when} · ${e.title}`);
  }
  if (timed.length > 5) items.push(`+${timed.length - 5} more`);
  for (const e of allDay.slice(0, 2)) {
    items.push(`All day · ${e.title}`);
  }
  if (allDay.length > 2) items.push(`+${allDay.length - 2} more all-day`);
  return { items };
}

function tasksSection(tasks: EveningRecapTask[]): {
  body?: string;
  items?: string[];
} {
  const done = tasks.filter((t) => t.done);
  const open = tasks.filter((t) => !t.done);
  if (done.length === 0 && open.length === 0) {
    return { body: "No tasks tracked for this day." };
  }
  const items: string[] = [];
  for (const t of done.slice(0, 4)) {
    items.push(`Done · ${t.label}`);
  }
  if (done.length > 4) items.push(`+${done.length - 4} more done`);
  for (const t of open.slice(0, 3)) {
    items.push(`Still open · ${t.label}`);
  }
  if (open.length > 3) items.push(`+${open.length - 3} still open`);
  return { items };
}

function journalBody(
  headline: string,
  summary: string | undefined,
): string | undefined {
  const h = headline.trim();
  const s = summary?.trim() ?? "";
  if (!h && !s) return undefined;
  if (h && s) return `${h} — ${s}`;
  return h || s;
}

/**
 * Build a short day recap for the evening close success screen.
 * Journal headline stays personal prose — never mix in world news here.
 */
export function buildEveningRecap(input: {
  scores: EveningRecapScores;
  intention?: string;
  headline: string;
  summary?: string;
  events: EveningRecapEvent[];
  tasks: EveningRecapTask[];
}): EveningRecap {
  const feeling = moodStressBody(input.scores);
  const intention = intentionBody(input.intention);
  const cal = calendarSection(input.events);
  const taskBlock = tasksSection(input.tasks);
  const journal = journalBody(input.headline, input.summary);

  const sections: EveningRecapSection[] = [
    { key: "you", label: "How it felt", body: feeling },
  ];

  if (intention) {
    sections.push({ key: "intention", label: "Morning aim", body: intention });
  }

  sections.push({
    key: "calendar",
    label: "On the day",
    body: cal.body,
    items: cal.items,
  });

  sections.push({
    key: "tasks",
    label: "Tasks",
    body: taskBlock.body,
    items: taskBlock.items,
  });

  if (journal) {
    sections.push({ key: "journal", label: "You wrote", body: journal });
  }

  const summaryBits: string[] = [feeling];
  if (intention) summaryBits.push(intention);
  if (cal.items?.length) {
    summaryBits.push(
      `Calendar had ${cal.items.length > 1 ? "a few marks" : "one mark"}: ${cal.items[0]}.`,
    );
  } else if (cal.body) {
    summaryBits.push(cal.body);
  }
  const doneCount = input.tasks.filter((t) => t.done).length;
  const openCount = input.tasks.filter((t) => !t.done).length;
  if (doneCount > 0 || openCount > 0) {
    const parts: string[] = [];
    if (doneCount > 0) parts.push(`${doneCount} done`);
    if (openCount > 0) parts.push(`${openCount} still open`);
    summaryBits.push(`Tasks: ${parts.join(", ")}.`);
  }
  if (input.headline.trim()) {
    summaryBits.push(`Headline: “${input.headline.trim()}”.`);
  }

  return {
    summary: summaryBits.join(" "),
    sections,
  };
}
