import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import {
  addVitalsReading,
  parseVitalsInput,
  removeVitalsReading,
} from "@/lib/vitals";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Journey vitals log — BP + HR (RB-028). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "add");

    if (action === "delete") {
      const id = String(body.id ?? "").trim();
      if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      const state = await updateState((prev) => {
        if (!prev.profile) {
          const err = new Error("Not onboarded");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        return removeVitalsReading(prev, id);
      });
      return NextResponse.json({ state });
    }

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const date = String(
        body.date ?? todayInTz(prev.profile.timezone),
      ).trim();
      const parsed = parseVitalsInput({
        date,
        period: body.period,
        systolic: body.systolic,
        diastolic: body.diastolic,
        heartRate: body.heartRate,
      });
      if (!parsed.ok) {
        const err = new Error(parsed.error);
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      return addVitalsReading(prev, parsed);
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
