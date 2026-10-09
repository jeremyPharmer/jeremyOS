import { NextResponse } from "next/server";
import { getMorning, todayInTz } from "@/lib/journey";
import { clampMorningScore, clampSleepHours } from "@/lib/morning-briefing";
import { clampFiveScore } from "@/lib/open-day-prose";
import { pickMorningQuote } from "@/lib/quotes";
import { updateState } from "@/lib/store";
import type { MorningCheckIn } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "create");

    if (action === "updateIntention") {
      const intention = String(body.intention ?? "").trim();
      if (!intention) {
        return NextResponse.json(
          { error: "Focus is required" },
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
        { error: "One thing to focus on is required" },
        { status: 400 },
      );
    }

    const sleepRaw = Number(body.sleepQuality);
    if (!Number.isFinite(sleepRaw)) {
      return NextResponse.json(
        { error: "Sleep quality is required" },
        { status: 400 },
      );
    }
    const sleepQuality = clampFiveScore(sleepRaw);

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
      // RB-042: Open collects sleep quality 1–5 + focus only.
      // Unused vitals stored at a neutral mid so legacy readers stay sane.
      const morning: MorningCheckIn = {
        date,
        sleepHours: clampSleepHours(
          body.sleepHours === undefined || body.sleepHours === null
            ? Number.NaN
            : Number(body.sleepHours),
        ),
        sleepQuality,
        mood: clampMorningScore(
          body.mood === undefined || body.mood === null
            ? Number.NaN
            : Number(body.mood),
        ),
        energy: clampMorningScore(
          body.energy === undefined || body.energy === null
            ? Number.NaN
            : Number(body.energy),
        ),
        stress: clampMorningScore(
          body.stress === undefined || body.stress === null
            ? Number.NaN
            : Number(body.stress),
        ),
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
