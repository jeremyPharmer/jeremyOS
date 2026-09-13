import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import { fetchBillsPanel } from "@/lib/bills";
import { readState } from "@/lib/store";

/**
 * Buffalo Bills Home panel (RB-034).
 * Returns null body `{ panel: null }` outside Bills season (Aug 1 – Mar 1).
 */
export async function GET(req: Request) {
  try {
    const state = await readState();
    const timezone = state.profile?.timezone ?? "America/Los_Angeles";
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const isoDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : todayInTz(timezone);

    const panel = await fetchBillsPanel(isoDate);
    return NextResponse.json({ panel, date: isoDate });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message, panel: null }, { status: 502 });
  }
}
