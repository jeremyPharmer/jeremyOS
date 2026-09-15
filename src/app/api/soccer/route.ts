import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import { fetchSoccerPanel } from "@/lib/soccer";
import { readState } from "@/lib/store";

/**
 * Webster Schroeder soccer Home panel (RB-035).
 * Returns `{ panel: null }` outside Aug 15 – Nov 15.
 */
export async function GET(req: Request) {
  try {
    const state = await readState();
    const timezone = state.profile?.timezone ?? "America/New_York";
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const isoDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : todayInTz(timezone);

    const panel = await fetchSoccerPanel(isoDate);
    return NextResponse.json({ panel, date: isoDate });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { error: err.message, panel: null },
      { status: 502 },
    );
  }
}
