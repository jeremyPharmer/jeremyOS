import { NextResponse } from "next/server";
import {
  getEvening,
  isValidEveningDate,
  todayInTz,
} from "@/lib/journey";
import { pendingCashableMoments } from "@/lib/fund";
import { applyJournalProseEdit } from "@/lib/journal";
import { applyEveningSideEffects } from "@/lib/mutations";
import { savePhotoDataUrl } from "@/lib/photos";
import { updateState } from "@/lib/store";
import type { EveningCheckIn } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let photoId: string | undefined;
    if (body.photoDataUrl) {
      photoId = await savePhotoDataUrl(String(body.photoDataUrl));
    }

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const today = todayInTz(prev.profile.timezone);
      const date = String(body.date ?? today);
      if (!isValidEveningDate(prev, date, today)) {
        const err = new Error(
          "Date must be a calendar day in the current run (not in the future)",
        );
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      if (getEvening(prev, date)) {
        const err = new Error("Evening already completed");
        (err as Error & { status: number }).status = 409;
        throw err;
      }
      const oneLine = String(body.oneLine ?? "").trim();
      if (!oneLine) {
        const err = new Error("One line is required");
        (err as Error & { status: number }).status = 400;
        throw err;
      }

      // Close always counts as aligned for reclaim / milestones.
      // Journey reset is Settings → Reset my journey.
      const evening: EveningCheckIn = {
        date,
        mood: Number(body.mood),
        stress: Number(body.stress),
        craving:
          body.craving !== undefined ? Number(body.craving) : undefined,
        alignment: "aligned",
        oneLine,
        expandedJournal: body.expandedJournal
          ? String(body.expandedJournal).trim() || undefined
          : undefined,
        completedAt: new Date().toISOString(),
      };

      let next = applyEveningSideEffects(prev, evening);

      // Clearing a prior “skip evening” so Home can reflect the close.
      next = {
        ...next,
        skips: (next.skips ?? []).filter(
          (s) => !(s.date === date && s.itemKey === "evening"),
        ),
      };

      // Upsert journal rows so a same-day entry written earlier on /journal
      // is updated in place instead of duplicated / overwritten in the bundle.
      next = applyJournalProseEdit(
        next,
        date,
        evening.oneLine,
        evening.expandedJournal ?? "",
        photoId !== undefined ? photoId : undefined,
      );
      return next;
    });
    return NextResponse.json({
      state,
      pendingRewards: pendingCashableMoments(state),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
