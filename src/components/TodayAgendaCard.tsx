"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { AgendaMonthCalendar } from "@/components/AgendaMonthCalendar";
import {
  AgendaEventComposer,
  type AgendaEventComposerInitial,
  type AgendaEventPayload,
} from "@/components/AgendaEventComposer";
import {
  applyCalendarTitleOverrides,
  calendarEventGroups,
  calendarHiddenEventIds,
  calendarTitleOverrides,
  displayCalendarTitle,
  filterHiddenCalendarEvents,
} from "@/lib/calendar-overrides";
import { isCustomAgendaId } from "@/lib/custom-agenda-shared";
import {
  resolveEventGroup,
  TASK_GROUP_COLORS,
  type TaskGroup,
} from "@/lib/task-groups";
import {
  buildMonthGrid,
  monthKey as toMonthKey,
  parseMonthKey,
} from "@/lib/workouts";
import {
  isAgendaEventPast,
  localMinutesInTz,
  parseAgendaDisplayTimeToMinutes,
} from "@/lib/agenda-past";
import {
  buildDayTimeline,
  clusterBlockHeightPx,
  eventBlockHeightPx,
  formatCompactRange,
  formatGapLabel,
  formatTimelineHour,
  laneDensity,
  laneStyle,
  suggestGapEventTimes,
} from "@/lib/agenda-day-timeline";
import type { WorkCalendarEvent } from "@/lib/work-calendar";
import { TaskGroupPicker } from "@/components/TaskGroupPicker";
import { SecondaryButton, PrimaryButton, Sheet } from "@/components/ui";

type AgendaResponse = {
  date: string;
  events: WorkCalendarEvent[];
  connected: boolean;
  errors?: string[];
  error?: string;
};

type AgendaTimeParts = {
  start: string;
  end?: string;
  joinable: boolean;
};

function agendaTimeParts(event: WorkCalendarEvent): AgendaTimeParts {
  if (event.allDay || event.startTime === "All day") {
    return { start: "All day", joinable: Boolean(event.url) };
  }
  if (event.startTime === "Anytime") {
    return { start: "Anytime", joinable: Boolean(event.url) };
  }
  return {
    start: event.startTime,
    end: event.endTime,
    joinable: Boolean(event.url),
  };
}

function shouldShowLocation(event: WorkCalendarEvent): boolean {
  if (!event.location) return false;
  if (!event.url) return true;
  const loc = event.location.toLowerCase();
  if (
    loc.includes("google meet") ||
    loc.includes("zoom") ||
    loc.includes("teams")
  ) {
    return false;
  }
  return true;
}

function AgendaTime({ event }: { event: WorkCalendarEvent }) {
  const { start, end, joinable } = agendaTimeParts(event);
  const hasEnd = Boolean(end && end !== start);
  const label = hasEnd ? `${start} to ${end}` : start;

  const content = (
    <>
      <span className="agenda-time-start">{start}</span>
      {hasEnd ? <span className="agenda-time-end">{end}</span> : null}
      {joinable ? (
        <span className="agenda-time-join" aria-hidden="true">
          Join
        </span>
      ) : null}
    </>
  );

  if (joinable && event.url) {
    return (
      <a
        className="agenda-time-block agenda-time-link"
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Join ${event.title} at ${label}`}
      >
        {content}
      </a>
    );
  }

  return <div className="agenda-time-block">{content}</div>;
}

function AgendaEventRow({
  event,
  displayTitle,
  past = false,
  group,
  timeline = false,
  timeLabel,
  onSave,
  onRemove,
}: {
  event: WorkCalendarEvent;
  displayTitle: string;
  past?: boolean;
  group?: TaskGroup;
  timeline?: boolean;
  timeLabel?: string;
  onSave: (next: { title: string; group: TaskGroup }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTitle);
  const [draftGroup, setDraftGroup] = useState<TaskGroup | "">(group ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustom = isCustomAgendaId(event.id);

  useEffect(() => {
    if (!editing) {
      setDraft(displayTitle);
      setDraftGroup(group ?? "");
    }
  }, [displayTitle, group, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    const nextTitle = draft.trim();
    if (!nextTitle || !draftGroup) return;
    if (nextTitle === displayTitle.trim() && draftGroup === (group ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: nextTitle, group: draftGroup });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const barStyle = group
    ? { ["--group-color" as string]: TASK_GROUP_COLORS[group] }
    : undefined;

  const titleBlock = editing ? (
    <div className="agenda-edit-block">
      <input
        ref={inputRef}
        className="agenda-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            setDraft(displayTitle);
            setDraftGroup(group ?? "");
            setEditing(false);
          }
        }}
        maxLength={120}
        aria-label="Event name"
      />
      <TaskGroupPicker
        value={draftGroup}
        onChange={setDraftGroup}
        id={`agenda-group-${event.id}`}
      />
      <div className="agenda-add-actions">
        <SecondaryButton
          type="button"
          disabled={saving}
          onClick={() => {
            setDraft(displayTitle);
            setDraftGroup(group ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={saving || !draft.trim() || !draftGroup}
          onClick={() => void commit()}
        >
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </div>
  ) : (
    <button
      type="button"
      className="agenda-title-btn"
      onClick={() => setEditing(true)}
      disabled={saving}
    >
      {displayTitle}
    </button>
  );

  if (timeline) {
    return (
      <div
        className={`agenda-day-event${isCustom ? " agenda-item-custom" : ""}${
          event.url ? " agenda-item-joinable" : ""
        }${past ? " agenda-item-past" : ""}${group ? " has-group-bar" : ""}`}
        style={barStyle}
      >
        <div className="agenda-day-event-main">
          {timeLabel ? (
            <p className="agenda-day-event-time">
              {timeLabel}
              {event.url ? (
                <a
                  className="agenda-day-join"
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join
                </a>
              ) : null}
            </p>
          ) : null}
          {titleBlock}
          {!editing && shouldShowLocation(event) ? (
            <p className="agenda-loc">{event.location}</p>
          ) : null}
        </div>
        {!editing ? (
          <button
            type="button"
            className="agenda-hide-btn"
            aria-label={`Remove ${displayTitle}`}
            disabled={saving}
            onClick={() => void onRemove()}
          >
            ×
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <li
      className={`agenda-item${isCustom ? " agenda-item-custom" : ""}${
        event.url ? " agenda-item-joinable" : ""
      }${past ? " agenda-item-past" : ""}${group ? " has-group-bar" : ""}`}
      style={barStyle}
    >
      <div className="agenda-body">
        {titleBlock}
        {!editing && shouldShowLocation(event) ? (
          <p className="agenda-loc">
            <span className="agenda-loc-pin" aria-hidden />
            {event.location}
          </p>
        ) : null}
      </div>
      <AgendaTime event={event} />
      {!editing ? (
        <button
          type="button"
          className="agenda-hide-btn"
          aria-label={`Remove ${displayTitle}`}
          disabled={saving}
          onClick={() => void onRemove()}
        >
          ×
        </button>
      ) : null}
    </li>
  );
}

/**
 * Combined today’s calendar agenda on Home (RB-023).
 */
export function TodayAgendaCard() {
  const { today, state, post } = useApp();
  const [viewDate, setViewDate] = useState(today);
  const [monthKey, setMonthKey] = useState(
    () => toMonthKey(Number(today.slice(0, 4)), Number(today.slice(5, 7))),
  );
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addInitial, setAddInitial] =
    useState<AgendaEventComposerInitial | null>(null);
  const [dayColors, setDayColors] = useState<Record<string, string[]>>({});
  const [now, setNow] = useState(() => new Date());
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({});
  /** Full day spine (8 AM bounds + open gaps). Default collapsed — event list + … */
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [peekEventId, setPeekEventId] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, AgendaResponse>>({});

  const personal = state.profile?.personalIcalUrl?.trim();
  const work = state.profile?.workIcalUrl?.trim();
  const extrasKey = (state.profile?.extraIcalUrls ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
    .join("\n");
  const [googleConnected, setGoogleConnected] = useState(false);
  const hasFeeds = Boolean(personal || work || extrasKey || googleConnected);
  const customSig = JSON.stringify(state.customAgendaEvents ?? []);
  const timezone = state.profile?.timezone || "America/New_York";
  // Stabilize object/Set identity — fresh {} / Set each render would re-fire
  // agenda effects forever and starve Home clicks (Close the day, Open workouts).
  const overrides = useMemo(
    () => calendarTitleOverrides(state),
    [state.calendarTitleOverrides],
  );
  const eventGroups = useMemo(
    () => calendarEventGroups(state),
    [state.calendarEventGroups],
  );
  const feedGroups = state.profile?.calendarFeedGroups;
  const hidden = useMemo(
    () => calendarHiddenEventIds(state),
    [state.calendarHiddenEventIds],
  );
  const monthDates = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey);
    return buildMonthGrid(year, month)
      .flat()
      .filter((d): d is string => Boolean(d));
  }, [monthKey]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setViewDate(today);
    setMonthKey(toMonthKey(Number(today.slice(0, 4)), Number(today.slice(5, 7))));
    cacheRef.current = {};
  }, [today]);

  useEffect(() => {
    setExpandedGaps({});
    setTimelineExpanded(false);
  }, [viewDate]);

  function selectDate(date: string) {
    setViewDate(date);
    setMonthKey(toMonthKey(Number(date.slice(0, 4)), Number(date.slice(5, 7))));
  }

  function jumpToToday() {
    selectDate(today);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadGoogleStatus() {
      try {
        const res = await fetch("/api/calendar/google/status", {
          credentials: "include",
        });
        const json = (await res.json()) as { connected?: boolean };
        if (!cancelled) setGoogleConnected(Boolean(json.connected));
      } catch {
        if (!cancelled) setGoogleConnected(false);
      }
    }
    void loadGoogleStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchAgenda(date: string): Promise<AgendaResponse> {
    const res = await fetch(
      `/api/calendar/work?date=${encodeURIComponent(date)}`,
    );
    return (await res.json()) as AgendaResponse;
  }


  function colorsForJson(json: AgendaResponse): string[] {
    const visible = filterHiddenCalendarEvents(
      applyCalendarTitleOverrides(json.events ?? [], overrides),
      hidden,
    );
    const colors: string[] = [];
    const seen = new Set<string>();
    for (const event of visible) {
      const group = resolveEventGroup({
        eventId: event.id,
        source: event.source,
        extraIndex: event.extraIndex,
        customGroup: event.group,
        overrides: eventGroups,
        feedGroups,
      });
      if (!group) continue;
      const color = TASK_GROUP_COLORS[group];
      if (seen.has(color)) continue;
      seen.add(color);
      colors.push(color);
      if (colors.length >= 4) break;
    }
    return colors;
  }

  useEffect(() => {
    // Feeds / custom events changed — drop client cache.
    cacheRef.current = {};
  }, [personal, work, extrasKey, googleConnected, customSig]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = cacheRef.current[viewDate];
      if (cached) {
        setData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      try {
        const json = await fetchAgenda(viewDate);
        if (cancelled) return;
        cacheRef.current[viewDate] = json;
        setData(json);
        const colors = colorsForJson(json);
        setDayColors((prev) => {
          const prevColors = prev[viewDate] ?? [];
          if (
            prevColors.length === colors.length &&
            prevColors.every((c, i) => c === colors[i])
          ) {
            return prev;
          }
          return { ...prev, [viewDate]: colors };
        });
      } catch {
        if (cancelled) return;
        if (!cacheRef.current[viewDate]) {
          setData({
            date: viewDate,
            events: [],
            connected: false,
            error: "Could not load calendar",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [viewDate, personal, work, extrasKey, googleConnected, customSig, overrides, hidden]);

  useEffect(() => {
    let cancelled = false;
    async function loadMonthMarkers() {
      // Prefetch month days in small batches so bars fill in without flooding Google.
      const batchSize = 5;
      for (let i = 0; i < monthDates.length; i += batchSize) {
        if (cancelled) return;
        const batch = monthDates.slice(i, i + batchSize);
        const entries = await Promise.all(
          batch.map(async (date) => {
            try {
              const cached = cacheRef.current[date];
              const json = cached ?? (await fetchAgenda(date));
              if (!cached) cacheRef.current[date] = json;
              return [date, colorsForJson(json)] as const;
            } catch {
              return [date, dayColors[date] ?? []] as const;
            }
          }),
        );
        if (cancelled) return;
        setDayColors((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const [date, colors] of entries) {
            const prevColors = next[date] ?? [];
            if (
              prevColors.length !== colors.length ||
              prevColors.some((c, idx) => c !== colors[idx])
            ) {
              next[date] = colors;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
    void loadMonthMarkers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayColors read only as fallback
  }, [monthDates, personal, work, extrasKey, googleConnected, customSig, overrides, hidden, eventGroups, feedGroups]);

  const dayReady = data?.date === viewDate;
  const rawEvents = dayReady ? (data?.events ?? []) : [];
  const visibleEvents = filterHiddenCalendarEvents(
    applyCalendarTitleOverrides(rawEvents, overrides),
    hidden,
  );
  // Chronological day spine (8am–9pm, later when events run past); keep order.
  const events = visibleEvents;
  const timeline = useMemo(() => buildDayTimeline(events), [events]);
  const dayEndLabel = formatTimelineHour(timeline.dayEnd);
  const nowMinutes =
    viewDate === today ? localMinutesInTz(now, timezone) : null;
  const connected = dayReady ? (data?.connected ?? false) : false;
  const showLoading = loading && !dayReady;
  const showSetup =
    !showLoading && !connected && !hasFeeds && events.length === 0;
  const showDaySpine =
    !showLoading && !showSetup && (connected || events.length > 0 || hasFeeds);

  const timedEvents = useMemo(() => {
    const allDayIds = new Set(timeline.allDay.map((e) => e.id));
    return events
      .filter((e) => !e.allDay && !allDayIds.has(e.id))
      .slice()
      .sort((a, b) => {
        const am = parseAgendaDisplayTimeToMinutes(a.startTime) ?? 0;
        const bm = parseAgendaDisplayTimeToMinutes(b.startTime) ?? 0;
        return am - bm || a.title.localeCompare(b.title);
      });
  }, [events, timeline.allDay]);

  async function saveEvent(
    eventId: string,
    next: { title: string; group: TaskGroup },
  ) {
    if (isCustomAgendaId(eventId)) {
      await post("/api/calendar/custom", {
        action: "update",
        id: eventId,
        title: next.title,
        group: next.group,
      });
      return;
    }
    await post("/api/calendar/overrides", {
      eventId,
      title: next.title,
      group: next.group,
    });
  }

  async function removeEvent(eventId: string) {
    if (isCustomAgendaId(eventId)) {
      await post("/api/calendar/custom", { action: "delete", id: eventId });
      return;
    }
    await post("/api/calendar/overrides", { eventId, hide: true });
  }

  async function addEvent(payload: AgendaEventPayload) {
    setAddBusy(true);
    try {
      await post("/api/calendar/custom", {
        action: "add",
        date: viewDate,
        title: payload.title,
        allDay: payload.allDay,
        startTime: payload.startTime,
        endTime: payload.endTime,
        group: payload.group,
      });
      setAdding(false);
      setAddInitial(null);
    } finally {
      setAddBusy(false);
    }
  }

  function openAdd(
    initial: AgendaEventComposerInitial | null = null,
  ) {
    setAddInitial(initial);
    setAdding(true);
  }

  function closeAdd() {
    setAdding(false);
    setAddInitial(null);
  }

  function openAddInGap(startMin: number, endMin: number) {
    openAdd(suggestGapEventTimes(startMin, endMin));
  }

  return (
    <section className="home-card home-card-agenda" aria-label="Today's calendar">
      <header className="agenda-header">
        <div className="agenda-header-top">
          <p className="home-card-kicker">Calendar</p>
          <div className="agenda-header-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Add reminder or event"
              onClick={() => openAdd(null)}
            >
              +
            </button>
          </div>
        </div>

        <AgendaMonthCalendar
          monthKey={monthKey}
          today={today}
          selectedDate={viewDate}
          dayColors={dayColors}
          onMonthChange={setMonthKey}
          onSelectDate={selectDate}
        />
        {viewDate !== today ? (
          <div className="agenda-today-row">
            <button
              type="button"
              className="agenda-today-pill"
              onClick={jumpToToday}
            >
              Today
            </button>
          </div>
        ) : null}
      </header>

      {peekEventId && (() => {
        const full = events.find((e) => e.id === peekEventId);
        if (!full) return null;
        const group = resolveEventGroup({
          eventId: full.id,
          source: full.source,
          extraIndex: full.extraIndex,
          customGroup: full.group,
          overrides: eventGroups,
          feedGroups,
        });
        const timeLabel =
          full.endTime && full.endTime !== full.startTime
            ? `${full.startTime} – ${full.endTime}`
            : full.startTime;
        const title = displayCalendarTitle(full, overrides);
        return (
          <Sheet
            label={title}
            onClose={() => setPeekEventId(null)}
          >
            <div className="agenda-day-peek">
              <AgendaEventRow
                event={full}
                timeline
                timeLabel={timeLabel}
                past={isAgendaEventPast(
                  full,
                  viewDate,
                  today,
                  now,
                  timezone,
                )}
                displayTitle={title}
                group={group}
                onSave={async (next) => {
                  await saveEvent(full.id, next);
                }}
                onRemove={async () => {
                  await removeEvent(full.id);
                  setPeekEventId(null);
                }}
              />
            </div>
          </Sheet>
        );
      })()}

      {adding && (
        <AgendaEventComposer
          key={
            addInitial
              ? `${addInitial.startTime ?? ""}-${addInitial.endTime ?? ""}`
              : "blank"
          }
          busy={addBusy}
          initial={addInitial}
          onSubmit={addEvent}
          onCancel={closeAdd}
        />
      )}

      {showLoading && <p className="muted tiny agenda-status">Loading…</p>}

      {!showLoading && showSetup && !adding && (
        <p className="muted agenda-status">
          Add your own reminders with <strong>+</strong>, or connect calendars in{" "}
          <Link href="/settings">Settings</Link>.
        </p>
      )}

      {showDaySpine && !adding && (
        <div className="agenda-day">
          {timeline.allDay.length > 0 && (
            <div className="agenda-day-allday">
              <p className="agenda-day-allday-label">All day</p>
              <div className="agenda-day-allday-list">
                {timeline.allDay.map((ev) => {
                  const full = events.find((e) => e.id === ev.id);
                  if (!full) return null;
                  const group = resolveEventGroup({
                    eventId: full.id,
                    source: full.source,
                    extraIndex: full.extraIndex,
                    customGroup: full.group,
                    overrides: eventGroups,
                    feedGroups,
                  });
                  return (
                    <AgendaEventRow
                      key={full.id}
                      event={full}
                      timeline
                      past={isAgendaEventPast(
                        full,
                        viewDate,
                        today,
                        now,
                        timezone,
                      )}
                      displayTitle={displayCalendarTitle(full, overrides)}
                      group={group}
                      onSave={(next) => saveEvent(full.id, next)}
                      onRemove={() => removeEvent(full.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {!timelineExpanded ? (
            <>
              {timedEvents.length > 0 ? (
                <ul className="agenda-list agenda-list-collapsed">
                  {timedEvents.map((full) => {
                    const group = resolveEventGroup({
                      eventId: full.id,
                      source: full.source,
                      extraIndex: full.extraIndex,
                      customGroup: full.group,
                      overrides: eventGroups,
                      feedGroups,
                    });
                    return (
                      <AgendaEventRow
                        key={full.id}
                        event={full}
                        past={isAgendaEventPast(
                          full,
                          viewDate,
                          today,
                          now,
                          timezone,
                        )}
                        displayTitle={displayCalendarTitle(full, overrides)}
                        group={group}
                        onSave={(next) => saveEvent(full.id, next)}
                        onRemove={() => removeEvent(full.id)}
                      />
                    );
                  })}
                </ul>
              ) : timeline.allDay.length === 0 ? (
                <p className="muted agenda-status">Nothing on the calendar.</p>
              ) : null}
              <button
                type="button"
                className="agenda-day-expand"
                onClick={() => setTimelineExpanded(true)}
                aria-label="Expand day timeline"
                aria-expanded={false}
              >
                <span className="agenda-day-expand-dots" aria-hidden>
                  …
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="agenda-day-expand agenda-day-collapse"
                onClick={() => {
                  setTimelineExpanded(false);
                  setExpandedGaps({});
                }}
                aria-label="Collapse day timeline"
                aria-expanded={true}
              >
                <span className="agenda-day-expand-dots" aria-hidden>
                  …
                </span>
              </button>
              <div
                className="agenda-day-spine"
                aria-label={`Day from 8 AM to ${dayEndLabel}`}
              >
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
                        <div className="agenda-day-gap-actions">
                          <button
                            type="button"
                            className="agenda-day-gap-add"
                            onClick={() =>
                              openAddInGap(block.startMin, block.endMin)
                            }
                          >
                            Add
                          </button>
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
                      </div>
                    );
                  }

                  if (block.kind === "cluster") {
                    const height = clusterBlockHeightPx(
                      block.startMin,
                      block.endMin,
                    );
                    const showNow =
                      nowMinutes != null &&
                      nowMinutes >= block.startMin &&
                      nowMinutes < block.endMin;
                    return (
                      <div
                        key={`cluster-${block.startMin}-${block.endMin}`}
                        className={`agenda-day-cluster${
                          showNow ? " agenda-day-cluster-now" : ""
                        }`}
                        style={{ height }}
                        aria-label={`${block.lanes.length} overlapping events`}
                      >
                        {block.lanes.map((lane) => {
                          const full = events.find((e) => e.id === lane.event.id);
                          if (!full) return null;
                          const group = resolveEventGroup({
                            eventId: full.id,
                            source: full.source,
                            extraIndex: full.extraIndex,
                            customGroup: full.group,
                            overrides: eventGroups,
                            feedGroups,
                          });
                          const place = laneStyle(
                            lane,
                            block.startMin,
                            block.endMin,
                            height,
                          );
                          const density = laneDensity(place.height, lane.columns);
                          const title = displayCalendarTitle(full, overrides);
                          const compactTime = formatCompactRange(
                            lane.startMin,
                            lane.endMin,
                          );
                          const past = isAgendaEventPast(
                            full,
                            viewDate,
                            today,
                            now,
                            timezone,
                          );
                          return (
                            <div
                              key={full.id}
                              className="agenda-day-lane"
                              style={{
                                top: place.top,
                                height: place.height,
                                left: place.left,
                                width: place.width,
                              }}
                            >
                              <button
                                type="button"
                                className={`agenda-day-lane-chip${
                                  group ? " has-group-bar" : ""
                                }${past ? " agenda-item-past" : ""}`}
                                style={
                                  group
                                    ? {
                                        ["--group-color" as string]:
                                          TASK_GROUP_COLORS[group],
                                      }
                                    : undefined
                                }
                                onClick={() => setPeekEventId(full.id)}
                                aria-label={`${title}, ${compactTime}`}
                              >
                                <span className="agenda-day-lane-chip-time">
                                  {compactTime}
                                </span>
                                {density === "time-title" ? (
                                  <span className="agenda-day-lane-chip-title">
                                    {title}
                                  </span>
                                ) : null}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  const full = events.find((e) => e.id === block.event.id);
                  if (!full) return null;
                  const group = resolveEventGroup({
                    eventId: full.id,
                    source: full.source,
                    extraIndex: full.extraIndex,
                    customGroup: full.group,
                    overrides: eventGroups,
                    feedGroups,
                  });
                  const timeLabel =
                    full.endTime && full.endTime !== full.startTime
                      ? `${full.startTime} – ${full.endTime}`
                      : full.startTime;
                  const showNow =
                    nowMinutes != null &&
                    nowMinutes >= block.startMin &&
                    nowMinutes < block.endMin;
                  return (
                    <div
                      key={full.id}
                      className={`agenda-day-slot${showNow ? " agenda-day-slot-now" : ""}`}
                      style={{
                        minHeight: eventBlockHeightPx(block.startMin, block.endMin),
                      }}
                    >
                      <AgendaEventRow
                        event={full}
                        timeline
                        timeLabel={timeLabel}
                        past={isAgendaEventPast(
                          full,
                          viewDate,
                          today,
                          now,
                          timezone,
                        )}
                        displayTitle={displayCalendarTitle(full, overrides)}
                        group={group}
                        onSave={(next) => saveEvent(full.id, next)}
                        onRemove={() => removeEvent(full.id)}
                      />
                    </div>
                  );
                })}
                <p className="agenda-day-bound agenda-day-bound-end" aria-hidden>
                  {dayEndLabel}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {!showLoading && dayReady && data?.errors && data.errors.length > 0 && (
        <p className="tiny agenda-feed-warn" role="status">
          {data.errors.join(" · ")}
        </p>
      )}
    </section>
  );
}
