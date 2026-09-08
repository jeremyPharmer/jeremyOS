import { NextResponse } from "next/server";
import {
  hideCalendarEvent,
  setCalendarEventGroup,
  setCalendarTitleOverride,
} from "@/lib/calendar-overrides";
import { parseTaskGroup } from "@/lib/task-groups";
import { updateState } from "@/lib/store";

/** Home agenda overrides: rename, group, or hide an event locally. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) {
      return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      let next = prev;
      if (body.hide === true) {
        return hideCalendarEvent(next, eventId);
      }
      if (body.title !== undefined) {
        next = setCalendarTitleOverride(next, eventId, String(body.title));
      }
      if (body.group !== undefined) {
        next = setCalendarEventGroup(next, eventId, parseTaskGroup(body.group));
      }
      if (body.title === undefined && body.group === undefined) {
        const err = new Error("title, group, or hide required");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      return next;
    });

    return NextResponse.json({ state });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
