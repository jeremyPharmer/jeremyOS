import { NextResponse } from "next/server";
import { getMorning, todayInTz } from "@/lib/journey";
import { clampMorningScore } from "@/lib/morning-briefing";
import { pickMorningQuote } from "@/lib/quotes";
import { updateState } from "@/lib/store";
import type { MorningCheckIn } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "create");

    if (action === "updateIntention") {
      // RB-027 dropped intention from morning UI; keep endpoint for older clients.
      const intention = String(body.intention ?? "").trim();
      if (!intention) {
        return NextResponse.json(
          { error: "Intention is required" },
          { status: 400 },
        );
      }
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const date = String(body.date ?? todayInTz(prev.profile.timezone));
        const existing = getMorning(prev, date);
        if (!existing) {
          const err = new Error("Morning not found for that day");
          (err as Error & { status: number }).status = 404;
          throw err;
        }
        return {
          ...prev,
          mornings: prev.mornings.map((m) =>
            m.date === date ? { ...m, intention } : m,
          ),
        };
      });
      return NextResponse.json({ state });
    }

    if (action === "undo") {
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const date = String(body.date ?? todayInTz(prev.profile.timezone));
        if (!getMorning(prev, date)) {
          const err = new Error("No morning check-in to undo");
          (err as Error & { status: number }).status = 404;
          throw err;
        }
        return {
          ...prev,
          mornings: prev.mornings.filter((m) => m.date !== date),
          // Clear morning skip so Start the day can return to the list
          skips: (prev.skips ?? []).filter(
            (s) => !(s.date === date && s.itemKey === "morning"),
          ),
        };
      });
      return NextResponse.json({ state });
    }

    const intention = String(body.intention ?? "").trim();
    if (!intention) {
      return NextResponse.json(
        { error: "Intention is required" },
        { status: 400 },
      );
    }

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const date = String(body.date ?? todayInTz(prev.profile.timezone));
      if (getMorning(prev, date)) {
        const err = new Error("Morning already completed");
        (err as Error & { status: number }).status = 409;
        throw err;
      }
      const quote = pickMorningQuote(prev.quoteLog, date);
      const morning: MorningCheckIn = {
        date,
        sleepHours: clampMorningScore(Number(body.sleepHours)),
        sleepQuality: clampMorningScore(Number(body.sleepQuality)),
        mood: clampMorningScore(Number(body.mood)),
        energy: clampMorningScore(Number(body.energy)),
        stress: clampMorningScore(Number(body.stress)),
        // Morning craving scale removed from UI; kept optional for older rows.
        craving: body.craving !== undefined ? Number(body.craving) : undefined,
        intention,
        trigger: body.trigger ? String(body.trigger) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
        quoteId: quote.id,
        completedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        mornings: [...prev.mornings, morning],
        quoteLog: [
          ...(prev.quoteLog ?? []),
          { quoteId: quote.id, usedOn: date },
        ],
        // Completing morning clears a same-day "Not today" dismiss
        skips: (prev.skips ?? []).filter(
          (s) => !(s.date === date && s.itemKey === "morning"),
        ),
      };
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
