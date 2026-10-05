import { NextResponse } from "next/server";
import {
  applyJournalProseEdit,
  bundleJournalsByDate,
  hasJournalContent,
  ignoreMissedEveningDate,
  toggleStarredDay,
} from "@/lib/journal";
import { getEvening, todayInTz } from "@/lib/journey";
import { savePhotoDataUrl } from "@/lib/photos";
import { updateState } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "ignoreMissed") {
      const date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: "Date must be YYYY-MM-DD" },
          { status: 400 },
        );
      }
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const asOf = todayInTz(prev.profile.timezone);
        return ignoreMissedEveningDate(prev, date, asOf);
      });
      return NextResponse.json({ state });
    }

    if (action === "toggleStar") {
      const date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: "Date must be YYYY-MM-DD" },
          { status: 400 },
        );
      }
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        // Bookmark days with journal prose or a closed evening
        const hasContent = getEvening(prev, date)
          ? true
          : hasJournalContent(
              bundleJournalsByDate(prev.journals),
              date,
            );
        if (!hasContent && !prev.starredDays?.includes(date)) {
          const err = new Error(
            "Write something on this day before starring it",
          );
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        return {
          ...prev,
          starredDays: toggleStarredDay(prev.starredDays, date),
        };
      });
      return NextResponse.json({ state });
    }

    if (action === "updateEntry") {
      const date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: "Date must be YYYY-MM-DD" },
          { status: 400 },
        );
      }
      const oneLine = String(body.oneLine ?? "").trim();
      if (!oneLine) {
        return NextResponse.json(
          { error: "Headline is required" },
          { status: 400 },
        );
      }

      let photoId: string | undefined;
      let attachPhoto = false;
      if (body.photoDataUrl) {
        photoId = await savePhotoDataUrl(String(body.photoDataUrl));
        attachPhoto = true;
      }

      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        const expanded =
          body.expandedJournal !== undefined
            ? String(body.expandedJournal)
            : undefined;
        return applyJournalProseEdit(
          prev,
          date,
          oneLine,
          expanded,
          attachPhoto ? photoId : undefined,
        );
      });
      return NextResponse.json({ state });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
