import { NextResponse } from "next/server";
import {
  addCustomAgendaEvent,
  formatAgendaTimeInput,
  isCustomAgendaId,
  removeCustomAgendaEvent,
  updateCustomAgendaEvent,
} from "@/lib/custom-agenda";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Add, update, or delete Jeremy's local Home calendar events. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "add");

    if (action === "delete") {
      const id = String(body.id ?? "").trim();
      if (!id || !isCustomAgendaId(id)) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      const state = await updateState((prev) => removeCustomAgendaEvent(prev, id));
      return NextResponse.json({ state });
    }

    if (action === "update") {
      const id = String(body.id ?? "").trim();
      if (!id || !isCustomAgendaId(id)) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const allDay = body.allDay === true;
        const startRaw = body.startTime ? String(body.startTime) : "";
        const endRaw = body.endTime ? String(body.endTime) : "";
        const startTime = allDay
          ? undefined
          : formatAgendaTimeInput(startRaw) ||
            (startRaw.trim() || undefined);
        const endTime = allDay
          ? undefined
          : formatAgendaTimeInput(endRaw) ||
            (endRaw.trim() || undefined);
        return updateCustomAgendaEvent(prev, id, {
          title: body.title !== undefined ? String(body.title) : undefined,
          allDay: body.allDay !== undefined ? allDay : undefined,
          startTime:
            body.startTime !== undefined ? startTime : undefined,
          endTime: body.endTime !== undefined ? endTime : undefined,
          note: body.note !== undefined ? String(body.note) : undefined,
          group: body.group !== undefined ? body.group : undefined,
        });
      });
      return NextResponse.json({ state });
    }

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const title = String(body.title ?? "").trim();
      if (!title) {
        const err = new Error("Title required");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const date = String(body.date ?? "").trim();
      const allDay = body.allDay === true;
      const startRaw = body.startTime ? String(body.startTime) : "";
      const endRaw = body.endTime ? String(body.endTime) : "";
      const startTime = allDay
        ? undefined
        : formatAgendaTimeInput(startRaw) || undefined;
      const endTime = allDay
        ? undefined
        : formatAgendaTimeInput(endRaw) || undefined;

      return addCustomAgendaEvent(prev, {
        date,
        title,
        allDay,
        startTime,
        endTime,
        note: body.note ? String(body.note) : undefined,
        group: body.group,
      });
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
