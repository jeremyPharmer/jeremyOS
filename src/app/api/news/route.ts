import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import { fetchBriefingHeadlines } from "@/lib/news";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Top headlines for Daily briefing (RB-032) — world + Bills in season.
 * Optional `date` (YYYY-MM-DD) drives Bills season; defaults to today.
 * Fail soft — empty list when feeds are unavailable.
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

    const headlines = await fetchBriefingHeadlines(date, 5);
    return NextResponse.json({
      headlines,
      date,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      headlines: [],
      fetchedAt: new Date().toISOString(),
    });
  }
}
