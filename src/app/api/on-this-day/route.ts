import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import { fetchOnThisDayEvent } from "@/lib/on-this-day";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * One world anniversary for On this date.
 * Optional `date` (YYYY-MM-DD); defaults to today in profile tz.
 */
export async function GET(req: Request) {
  try {
    const state = await readState();
    const timezone = state.profile?.timezone ?? "America/Los_Angeles";
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date")?.trim();
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : todayInTz(timezone);

    const event = await fetchOnThisDayEvent(date);
    return NextResponse.json({
      date,
      event,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      event: null,
      fetchedAt: new Date().toISOString(),
    });
  }
}
