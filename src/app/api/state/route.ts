import { NextResponse } from "next/server";
import { getSessionUser, sessionPublic } from "@/lib/auth";
import { isProdEnv } from "@/lib/env";
import { buildDashboard, emptyState, todayInTz } from "@/lib/journey";
import { pendingCashableMoments } from "@/lib/fund";
import {
  ensureElapsedReclaimDays,
  ensureMilestonesReached,
} from "@/lib/mutations";
import { ensureElapsedSaveGoalDays } from "@/lib/save-goals";
import { updateState } from "@/lib/store";
import { ensureTodosRolled } from "@/lib/todos";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
        state: emptyState(),
        today: todayInTz(),
        dashboard: null,
        pendingRewards: [],
        env: isProdEnv() ? "prod" : "dev",
      },
      { status: 401 },
    );
  }

  const state = await updateState((prev) => {
    if (!prev.profile) return prev;
    const today = todayInTz(prev.profile.timezone);
    // RB-011: catch up daily savings for ended days even without evening close.
    let next = ensureElapsedReclaimDays(prev, today);
    // RB-037: missed Save Goal approves → auto-credit full daily inbound.
    next = ensureElapsedSaveGoalDays(next, today);
    next = ensureMilestonesReached(next, today);
    next = ensureTodosRolled(next, today);
    return next;
  });
  const today = state.profile
    ? todayInTz(state.profile.timezone)
    : todayInTz();
  return NextResponse.json({
    authenticated: true,
    user: sessionPublic(user),
    state,
    today,
    dashboard: buildDashboard(state, today),
    pendingRewards: pendingCashableMoments(state),
    env: isProdEnv() ? "prod" : "dev",
  });
}
