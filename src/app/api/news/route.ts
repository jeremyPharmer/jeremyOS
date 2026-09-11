import { NextResponse } from "next/server";
import { fetchWorldHeadlines } from "@/lib/news";

export const dynamic = "force-dynamic";

/**
 * 3–5 major world headlines for evening close success (RB-029).
 * Fail soft — empty list when feeds are unavailable.
 */
export async function GET() {
  try {
    const headlines = await fetchWorldHeadlines(5);
    return NextResponse.json({
      headlines,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      headlines: [],
      fetchedAt: new Date().toISOString(),
    });
  }
}
