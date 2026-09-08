"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
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
import { homeDaySecondary } from "@/lib/home-day-nav";
import { addDays } from "@/lib/journey";
import {
  formatMonthDay,
  resolveEventGroup,
  TASK_GROUP_COLORS,
  type TaskGroup,
} from "@/lib/task-groups";
import { dayAbbrev } from "@/lib/weather";
import {
  isAgendaEventPast,
  localMinutesInTz,
} from "@/lib/agenda-past";
import {
  buildDayTimeline,
  clusterBlockHeightPx,
  eventBlockHeightPx,
  formatGapLabel,
  formatTimelineHour,
  laneStyle,
  suggestGapEventTimes,
} from "@/lib/agenda-day-timeline";
import type { WorkCalendarEvent } from "@/lib/work-calendar";
import { TaskGroupPicker } from "@/components/TaskGroupPicker";
import { SecondaryButton, PrimaryButton } from "@/components/ui";

function threeDayWindow(start: string): [string, string, string] {
  return [start, addDays(start, 1), addDays(start, 2)];
}

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
  compact = false,
  timeLabel,
  onSave,
  onRemove,
}: {
  event: WorkCalendarEvent;
  displayTitle: string;
  past?: boolean;
  group?: TaskGroup;
  timeline?: boolean;
  /** Narrow column inside an overlap cluster */
  compact?: boolean;
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
        className={`agenda-day-event${compact ? " agenda-day-event-compact" : ""}${
          isCustom ? " agenda-item-custom" : ""
        }${event.url ? " agenda-item-joinable" : ""}${
          past ? " agenda-item-past" : ""
        }${group ? " has-group-bar" : ""}`}
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
          {!editing && !compact && shouldShowLocation(event) ? (
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
      <AgendaTime event={event} />
      <div className="agenda-body">
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
    </li>
  );
}

/**
 * Combined today’s calendar agenda on Home (RB-023).
 */
export function TodayAgendaCard() {
  const { today, state, post } = useApp();
  const [viewDate, setViewDate] = useState(today);
  const [windowStart, setWindowStart] = useState(today);
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addInitial, setAddInitial] =
    useState<AgendaEventComposerInitial | null>(null);
  const [stripCounts, setStripCounts] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => new Date());
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({});
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
  const stripDays = useMemo(
    () => threeDayWindow(windowStart),
    [windowStart],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setViewDate(today);
    setWindowStart(today);
    cacheRef.current = {};
  }, [today]);

  useEffect(() => {
    setExpandedGaps({});
  }, [viewDate]);

  useEffect(() => {
    if (!stripDays.includes(viewDate)) {
      setViewDate(stripDays[0]);
    }
  }, [stripDays, viewDate]);

  function shiftWindow(deltaDays: number) {
    setWindowStart((start) => {
      const next = addDays(start, deltaDays);
      setViewDate(next);
      return next;
    });
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

  function visibleCount(json: AgendaResponse): number {
    return filterHiddenCalendarEvents(
      applyCalendarTitleOverrides(json.events ?? [], overrides),
      hidden,
    ).length;
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
        const count = visibleCount(json);
        setStripCounts((prev) =>
          prev[viewDate] === count ? prev : { ...prev, [viewDate]: count },
        );
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
    async function loadStrip() {
      const entries = await Promise.all(
        stripDays.map(async (date) => {
          try {
            const cached = cacheRef.current[date];
            const json = cached ?? (await fetchAgenda(date));
            if (!cached) cacheRef.current[date] = json;
            return [date, visibleCount(json)] as const;
          } catch {
            return [date, stripCounts[date] ?? 0] as const;
          }
        }),
      );
      if (!cancelled) {
        setStripCounts((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const [date, count] of entries) {
            if (next[date] !== count) {
              next[date] = count;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
    void loadStrip();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stripCounts read only as fallback
  }, [stripDays, personal, work, extrasKey, googleConnected, customSig, overrides, hidden]);

  const dayReady = data?.date === viewDate;
  const rawEvents = dayReady ? (data?.events ?? []) : [];
  const visibleEvents = filterHiddenCalendarEvents(
    applyCalendarTitleOverrides(rawEvents, overrides),
    hidden,
  );
  // Chronological day spine (8am–9pm); do not sink past events out of order.
  const events = visibleEvents;
  const timeline = useMemo(() => buildDayTimeline(events), [events]);
  const nowMinutes =
    viewDate === today ? localMinutesInTz(now, timezone) : null;
  const connected = dayReady ? (data?.connected ?? false) : false;
  const showLoading = loading && !dayReady;
  const showSetup =
    !showLoading && !connected && !hasFeeds && events.length === 0;
  const showDaySpine =
    !showLoading && !showSetup && (connected || events.length > 0 || hasFeeds);

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

        <div className="tasks-day-strip-nav">
          <button
            type="button"
            className="btn ghost workout-cal-arrow tasks-day-strip-arrow"
            aria-label="Previous three days"
            onClick={() => shiftWindow(-3)}
          >
            ‹
          </button>
          <div
            className="tasks-day-strip"
            role="tablist"
            aria-label="Three-day window"
          >
            {stripDays.map((date) => {
              const selected = date === viewDate;
              const count = stripCounts[date] ?? 0;
              const label =
                date === today
                  ? "Today"
                  : date === addDays(today, 1)
                    ? "Tom"
                    : dayAbbrev(date);
              const dayStatus = formatMonthDay(date);
              return (
                <button
                  key={date}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`tasks-day-chip${selected ? " selected" : ""}`}
                  onClick={() => setViewDate(date)}
                >
                  <span className="tasks-day-chip-label">{label}</span>
                  <span className="tasks-day-chip-status" aria-hidden>
                    {dayStatus}
                  </span>
                  <span className="sr-only">
                    {homeDaySecondary(date)}
                    {count === 0 ? ", no events" : `, ${count} events`}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn ghost workout-cal-arrow tasks-day-strip-arrow"
            aria-label="Next three days"
            onClick={() => shiftWindow(3)}
          >
            ›
          </button>
        </div>
      </header>

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
        <div className="agenda-day" aria-label="Day from 8 AM to 9 PM">
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
                      const timeLabel =
                        full.endTime && full.endTime !== full.startTime
                          ? `${full.startTime} – ${full.endTime}`
                          : full.startTime;
                      const place = laneStyle(
                        lane,
                        block.startMin,
                        block.endMin,
                        height,
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
                          <AgendaEventRow
                            event={full}
                            timeline
                            compact={lane.columns > 1}
                            timeLabel={timeLabel}
                            past={isAgendaEventPast(
                              full,
                              viewDate,
                              today,
                              now,
                              timezone,
                            )}
                            displayTitle={displayCalendarTitle(
                              full,
                              overrides,
                            )}
                            group={group}
                            onSave={(next) => saveEvent(full.id, next)}
                            onRemove={() => removeEvent(full.id)}
                          />
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
              9 PM
            </p>
          </div>
        </div>
      )}

      {!showLoading && dayReady && data?.errors && data.errors.length > 0 && (
        <p className="tiny form-error">{data.errors.join(" · ")}</p>
      )}
    </section>
  );
}
