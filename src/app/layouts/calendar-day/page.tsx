"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  buildDayTimeline,
  eventBlockHeightPx,
  formatGapLabel,
  formatTimelineHour,
} from "@/lib/agenda-day-timeline";
import { TASK_GROUP_COLORS, type TaskGroup } from "@/lib/task-groups";
import type { WorkCalendarEvent } from "@/lib/work-calendar";

type Sample = {
  id: string;
  title: string;
  blurb: string;
  events: WorkCalendarEvent[];
};

const SAMPLES: Sample[] = [
  {
    id: "busy",
    title: "Busy weekday",
    blurb: "Meetings with long empty stretches collapsed between them.",
    events: [
      {
        id: "b1",
        title: "Standup",
        startTime: "9:00 AM",
        endTime: "9:30 AM",
        source: "work",
        group: "work",
      },
      {
        id: "b2",
        title: "Weekly BD Meeting",
        startTime: "1:00 PM",
        endTime: "2:00 PM",
        url: "https://example.com",
        source: "work",
        group: "work",
      },
      {
        id: "b3",
        title: "E1 Rearrangement",
        startTime: "2:00 PM",
        endTime: "2:30 PM",
        source: "work",
        group: "home",
      },
      {
        id: "b4",
        title: "Family dinner",
        startTime: "6:30 PM",
        endTime: "7:30 PM",
        source: "personal",
        group: "family",
      },
    ],
  },
  {
    id: "sparse",
    title: "Light day",
    blurb: "One morning block — most of the day stays elegantly collapsed.",
    events: [
      {
        id: "s1",
        title: "Focus block",
        startTime: "10:00 AM",
        endTime: "11:30 AM",
        source: "custom",
        group: "real_estate",
      },
      {
        id: "s2",
        title: "Walk",
        startTime: "All day",
        allDay: true,
        source: "custom",
        group: "home",
      },
    ],
  },
  {
    id: "clear",
    title: "Clear day",
    blurb: "Nothing scheduled — still shows the 8 AM–9 PM frame.",
    events: [],
  },
];

function SampleDay({ sample }: { sample: Sample }) {
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({});
  const timeline = useMemo(
    () => buildDayTimeline(sample.events),
    [sample.events],
  );

  return (
    <article className="home-card home-card-agenda calendar-sample-card">
      <header className="agenda-header">
        <p className="home-card-kicker">Calendar</p>
        <h2 className="calendar-sample-title">{sample.title}</h2>
        <p className="muted tiny" style={{ margin: 0 }}>
          {sample.blurb}
        </p>
      </header>

      <div className="agenda-day" aria-label="Day from 8 AM to 9 PM">
        {timeline.allDay.length > 0 && (
          <div className="agenda-day-allday">
            <p className="agenda-day-allday-label">All day</p>
            <div className="agenda-day-allday-list">
              {timeline.allDay.map((ev) => {
                const full = sample.events.find((e) => e.id === ev.id)!;
                const group = full.group as TaskGroup | undefined;
                return (
                  <div
                    key={full.id}
                    className={`agenda-day-event${group ? " has-group-bar" : ""}`}
                    style={
                      group
                        ? {
                            ["--group-color" as string]:
                              TASK_GROUP_COLORS[group],
                          }
                        : undefined
                    }
                  >
                    <div className="agenda-day-event-main">
                      <button type="button" className="agenda-title-btn">
                        {full.title}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="agenda-day-spine">
          <p className="agenda-day-bound agenda-day-bound-start" aria-hidden>
            8 AM
          </p>
          {timeline.blocks.map((block) => {
            if (block.kind === "gap") {
              const key = `${block.startMin}-${block.endMin}`;
              const expanded = Boolean(expandedGaps[key]);
              const collapsed = block.collapsed && !expanded;
              if (collapsed) {
                return (
                  <button
                    key={key}
                    type="button"
                    className="agenda-day-gap-collapsed"
                    onClick={() =>
                      setExpandedGaps((prev) => ({ ...prev, [key]: true }))
                    }
                    aria-label={`Expand ${formatGapLabel(block.startMin, block.endMin)}`}
                  >
                    <span className="agenda-day-gap-dots" aria-hidden>
                      …
                    </span>
                  </button>
                );
              }
              return (
                <div key={key} className="agenda-day-gap-open">
                  <div className="agenda-day-gap-rail" aria-hidden />
                  <div className="agenda-day-gap-meta">
                    <span>{formatTimelineHour(block.startMin)}</span>
                    <span className="agenda-day-gap-quiet">open</span>
                    <span>{formatTimelineHour(block.endMin)}</span>
                  </div>
                  {block.collapsed ? (
                    <button
                      type="button"
                      className="agenda-day-gap-collapse"
                      onClick={() =>
                        setExpandedGaps((prev) => ({
                          ...prev,
                          [key]: false,
                        }))
                      }
                    >
                      Collapse
                    </button>
                  ) : null}
                </div>
              );
            }

            const full = sample.events.find((e) => e.id === block.event.id)!;
            const group = full.group as TaskGroup | undefined;
            const timeLabel =
              full.endTime && full.endTime !== full.startTime
                ? `${full.startTime} – ${full.endTime}`
                : full.startTime;
            return (
              <div
                key={full.id}
                className="agenda-day-slot"
                style={{
                  minHeight: eventBlockHeightPx(block.startMin, block.endMin),
                }}
              >
                <div
                  className={`agenda-day-event${group ? " has-group-bar" : ""}${
                    full.url ? " agenda-item-joinable" : ""
                  }`}
                  style={
                    group
                      ? {
                          ["--group-color" as string]:
                            TASK_GROUP_COLORS[group],
                        }
                      : undefined
                  }
                >
                  <div className="agenda-day-event-main">
                    <p className="agenda-day-event-time">
                      {timeLabel}
                      {full.url ? (
                        <span className="agenda-day-join">Join</span>
                      ) : null}
                    </p>
                    <button type="button" className="agenda-title-btn">
                      {full.title}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="agenda-day-bound agenda-day-bound-end" aria-hidden>
            9 PM
          </p>
        </div>
      </div>
    </article>
  );
}

export default function CalendarDaySamplesPage() {
  return (
    <main className="stack fade-in calendar-samples-page">
      <p className="eyebrow">Preview</p>
      <h1>Calendar day spine</h1>
      <p className="muted">
        Sample layouts for the Home calendar — 8 AM to 9 PM, empty stretches
        collapsed. Tap a gap chip to expand.
      </p>
      <p className="tiny muted">
        <Link href="/layouts">← Layouts</Link>
        {" · "}
        Live app:{" "}
        <a href="https://jeremyos-prod.fly.dev" target="_blank" rel="noreferrer">
          jeremyos-prod.fly.dev
        </a>
      </p>

      <div className="calendar-samples-grid">
        {SAMPLES.map((sample) => (
          <SampleDay key={sample.id} sample={sample} />
        ))}
      </div>
    </main>
  );
}
