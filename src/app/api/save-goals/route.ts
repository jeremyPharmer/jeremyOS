import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import {
  applySaveGoalAdjustment,
  createSaveGoal,
  recordSaveGoalDay,
  setInboundPercents,
  setSoleDailyTarget,
  updateSaveGoal,
  updateSaveGoalSettings,
} from "@/lib/save-goals";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Save Goals CRUD + evening money day + inbound % + one-time adjust (RB-037).
 * Tracking-only — does not touch Future / Treat / Venmo Total.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "create");

    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const today = todayInTz(prev.profile.timezone);

      if (action === "create") {
        return createSaveGoal(prev, {
          name: String(body.name ?? ""),
          targetAmount: Number(body.targetAmount),
          createdOn: String(body.createdOn ?? today),
          claimDailyInbound:
            body.claimDailyInbound !== undefined
              ? Boolean(body.claimDailyInbound)
              : undefined,
        });
      }

      if (action === "update") {
        return updateSaveGoal(prev, {
          id: String(body.id ?? ""),
          name: body.name !== undefined ? String(body.name) : undefined,
          targetAmount:
            body.targetAmount !== undefined
              ? Number(body.targetAmount)
              : undefined,
          status: body.status,
        });
      }

      if (action === "archive") {
        return updateSaveGoal(prev, {
          id: String(body.id ?? ""),
          status: "archived",
        });
      }

      if (action === "settings") {
        return updateSaveGoalSettings(prev, {
          monthlyIncome:
            body.monthlyIncome !== undefined
              ? Number(body.monthlyIncome)
              : undefined,
          incomeDayOfMonth:
            body.incomeDayOfMonth !== undefined
              ? Number(body.incomeDayOfMonth)
              : undefined,
        });
      }

      if (action === "setInbound") {
        if (body.soleGoalId) {
          return setSoleDailyTarget(prev, String(body.soleGoalId));
        }
        const percents =
          body.percents && typeof body.percents === "object"
            ? (body.percents as Record<string, number>)
            : {};
        return setInboundPercents(prev, percents);
      }

      if (action === "adjust") {
        return applySaveGoalAdjustment(prev, {
          date: String(body.date ?? today),
          amount: Number(body.amount),
          mode: body.mode === "custom" ? "custom" : "preset",
          goalId: body.goalId !== undefined ? String(body.goalId) : undefined,
          goalIds: Array.isArray(body.goalIds)
            ? body.goalIds.map((id: unknown) => String(id))
            : undefined,
          allocations: Array.isArray(body.allocations)
            ? body.allocations
            : undefined,
        });
      }

      if (action === "closeDay") {
        return recordSaveGoalDay(prev, {
          date: String(body.date ?? today),
          spendTotal: Number(body.spendTotal),
          lumpSum: body.lumpSum !== undefined ? Number(body.lumpSum) : 0,
          lumpMode: body.lumpMode === "custom" ? "custom" : "preset",
          lumpGoalId:
            body.lumpGoalId !== undefined
              ? String(body.lumpGoalId)
              : undefined,
          lumpGoalIds: Array.isArray(body.lumpGoalIds)
            ? body.lumpGoalIds.map((id: unknown) => String(id))
            : undefined,
          lumpAllocations: Array.isArray(body.lumpAllocations)
            ? body.lumpAllocations
            : undefined,
          allocations: Array.isArray(body.allocations)
            ? body.allocations
            : undefined,
        });
      }

      const err = new Error(`Unknown action: ${action}`);
      (err as Error & { status: number }).status = 400;
      throw err;
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
