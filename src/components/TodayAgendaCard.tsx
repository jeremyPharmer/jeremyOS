"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import {
  AgendaEventComposer,
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
  orderAgendaUpcomingThenPast,
} from "@/lib/agenda-past";
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
  onSave,
  onRemove,
}: {
  event: WorkCalendarEvent;
  displayTitle: string;
  past?: boolean;
  group?: TaskGroup;
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

  return (
    <li
      className={`agenda-item${isCustom ? " agenda-item-custom" : ""}${
        event.url ? " agenda-item-joinable" : ""
      }${past ? " agenda-item-past" : ""}${group ? " has-group-bar" : ""}`}
      style={barStyle}
    >
      <AgendaTime event={event} />
      <div className="agenda-body">
        {editing ? (
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
        )}
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
  const [stripCounts, setStripCounts] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => new Date());
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
  const events = orderAgendaUpcomingThenPast(
    visibleEvents,
    viewDate,
    today,
    now,
    timezone,
  );
  const connected = dayReady ? (data?.connected ?? false) : false;
  const showLoading = loading && !dayReady;
  const showSetup = !showLoading && !connected && !hasFeeds && events.length === 0;

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
    } finally {
      setAddBusy(false);
    }
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
              onClick={() => setAdding(true)}
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
                    ? "Tomorrow"
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
          busy={addBusy}
          onSubmit={addEvent}
          onCancel={() => setAdding(false)}
        />
      )}

      {showLoading && <p className="muted tiny agenda-status">Loading…</p>}

      {!showLoading && showSetup && !adding && (
        <p className="muted agenda-status">
          Add your own reminders with <strong>+</strong>, or connect calendars in{" "}
          <Link href="/settings">Settings</Link>.
        </p>
      )}

      {!showLoading && connected && events.length === 0 && !adding && (
        <p className="muted agenda-status">Clear day — tap + to add something.</p>
      )}

      {!showLoading && events.length > 0 && (
        <div className="agenda-schedule">
          <ul className="agenda-list">
            {events.map((ev) => {
              const group = resolveEventGroup({
                eventId: ev.id,
                source: ev.source,
                extraIndex: ev.extraIndex,
                customGroup: ev.group,
                overrides: eventGroups,
                feedGroups,
              });
              return (
                <AgendaEventRow
                  key={ev.id}
                  event={ev}
                  past={isAgendaEventPast(ev, viewDate, today, now, timezone)}
                  displayTitle={displayCalendarTitle(ev, overrides)}
                  group={group}
                  onSave={(next) => saveEvent(ev.id, next)}
                  onRemove={() => removeEvent(ev.id)}
                />
              );
            })}
          </ul>
        </div>
      )}

      {!showLoading && dayReady && data?.errors && data.errors.length > 0 && (
        <p className="tiny form-error">{data.errors.join(" · ")}</p>
      )}
    </section>
  );
}
