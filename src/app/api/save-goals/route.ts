import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/journey";
import {
  addSaveGoalSpend,
  applySaveGoalAdjustment,
  applySaveGoalDayTotals,
  applySaveGoalRolledOnly,
  clearSaveGoalDaySpend,
  createSaveGoal,
  deleteSaveGoal,
  recordSaveGoalDay,
  removeSaveGoalAdjustment,
  removeSaveGoalSpend,
  setGoalInboundPercent,
  setInboundPercents,
  setSaveGoalSavedAmount,
  setSoleDailyTarget,
  undoApplySaveGoalDayTotals,
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
        const id = String(body.id ?? "");
        let next = updateSaveGoal(prev, {
          id,
          name: body.name !== undefined ? String(body.name) : undefined,
          targetAmount:
            body.targetAmount !== undefined
              ? Number(body.targetAmount)
              : undefined,
          status: body.status,
        });
        if (body.savedAmount !== undefined && body.savedAmount !== null) {
          next = setSaveGoalSavedAmount(next, {
            id,
            savedAmount: Number(body.savedAmount),
            date: String(body.date ?? today),
          });
        }
        return next;
      }

      if (action === "archive") {
        return updateSaveGoal(prev, {
          id: String(body.id ?? ""),
          status: "archived",
        });
      }

      if (action === "delete") {
        return deleteSaveGoal(prev, {
          id: String(body.id ?? ""),
          date: String(body.date ?? today),
          reallocateToGoalId:
            body.reallocateToGoalId === undefined ||
            body.reallocateToGoalId === null
              ? null
              : String(body.reallocateToGoalId),
        });
      }

      if (action === "removeAdjust") {
        return removeSaveGoalAdjustment(prev, String(body.id ?? ""));
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
        if (body.goalId !== undefined && body.percent !== undefined) {
          return setGoalInboundPercent(
            prev,
            String(body.goalId),
            Number(body.percent),
          );
        }
        const percents =
          body.percents && typeof body.percents === "object"
            ? (body.percents as Record<string, number>)
            : {};
        return setInboundPercents(prev, percents);
      }

      if (action === "adjust") {
        const adjustDate = String(body.date ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(adjustDate)) {
          const err = new Error("Pick a date for the adjustment");
          (err as Error & { status: number }).status = 400;
          throw err;
        }
        return applySaveGoalAdjustment(prev, {
          date: adjustDate,
          amount: Number(body.amount),
          mode: body.mode === "custom" ? "custom" : "preset",
          goalId: body.goalId !== undefined ? String(body.goalId) : undefined,
          goalIds: Array.isArray(body.goalIds)
            ? body.goalIds.map((id: unknown) => String(id))
            : undefined,
          allocations: Array.isArray(body.allocations)
            ? body.allocations
            : undefined,
          note: body.note !== undefined ? String(body.note) : undefined,
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
          drawFromGoalId:
            body.drawFromGoalId !== undefined && body.drawFromGoalId !== null
              ? String(body.drawFromGoalId)
              : undefined,
          source: body.source === "auto" ? "auto" : "manual",
        });
      }

      if (action === "addSpend") {
        return addSaveGoalSpend(prev, {
          date: String(body.date ?? today),
          amount: Number(body.amount),
          note: body.note !== undefined ? String(body.note) : undefined,
          kind: body.kind === "add" ? "add" : "spend",
          category:
            body.category !== undefined ? String(body.category) : undefined,
        });
      }

      if (action === "removeSpend") {
        return removeSaveGoalSpend(prev, String(body.id ?? ""));
      }

      if (action === "applyTotals") {
        const date = String(body.date ?? today);
        const drawFromGoalId =
          body.drawFromGoalId !== undefined && body.drawFromGoalId !== null
            ? String(body.drawFromGoalId)
            : undefined;
        if (body.scope === "rolled") {
          return applySaveGoalRolledOnly(prev, { date, drawFromGoalId });
        }
        const leftoverMode =
          body.leftoverMode === "custom" ? ("custom" as const) : ("preset" as const);
        return applySaveGoalDayTotals(prev, {
          date,
          lumpSum: body.lumpSum !== undefined ? Number(body.lumpSum) : 0,
          drawFromGoalId,
          leftoverMode,
          leftoverGoalId:
            body.leftoverGoalId !== undefined && body.leftoverGoalId !== null
              ? String(body.leftoverGoalId)
              : undefined,
          leftoverGoalIds: Array.isArray(body.leftoverGoalIds)
            ? body.leftoverGoalIds.map((id: unknown) => String(id))
            : undefined,
          leftoverAllocations: Array.isArray(body.leftoverAllocations)
            ? body.leftoverAllocations.map(
                (a: { goalId?: unknown; amount?: unknown }) => ({
                  goalId: String(a?.goalId ?? ""),
                  amount: Number(a?.amount),
                }),
              )
            : undefined,
        });
      }

      if (action === "undoApply") {
        return undoApplySaveGoalDayTotals(prev, String(body.date ?? today));
      }

      if (action === "clearDaySpend") {
        return clearSaveGoalDaySpend(prev, String(body.date ?? today));
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
