import { NextResponse } from "next/server";
import { refreshSessionCookie, requireSessionUser } from "@/lib/auth";
import { FUTURE_SPLIT, TREAT_SPLIT } from "@/lib/fund";
import { newId } from "@/lib/journey";
import { updateState, updateUserRecord } from "@/lib/store";
import { SUPPORT_LABEL_MAX } from "@/lib/auth-constants";
import { migrateLongTermTrackers } from "@/lib/long-term-trackers";
import { DEFAULT_SUPPORTS, type RewardCategory, type SupportConfig } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  try {
    const account = await requireSessionUser();
    const displayName =
      String(body.displayName ?? account.displayName).trim() ||
      account.displayName;
    const historicalDailySpend = Number(body.historicalDailySpend);
    if (!Number.isFinite(historicalDailySpend) || historicalDailySpend < 0) {
      return NextResponse.json(
        { error: "historicalDailySpend required" },
        { status: 400 },
      );
    }

    const migrated = migrateLongTermTrackers(
      Array.isArray(body.supports)
        ? body.supports.filter(
            (s: SupportConfig) => s && s.enabled !== false && s.label,
          )
        : DEFAULT_SUPPORTS,
      // Onboarding choices are intentional (inspiration chips may include gym etc.).
      true,
    );
    const supports: SupportConfig[] = migrated.supports;

    if (supports.length === 0) {
      return NextResponse.json(
        { error: "Choose at least one long-term tracker" },
        { status: 400 },
      );
    }

    const startDate = String(body.startDate ?? "").trim();
    const timezone = String(
      body.timezone ?? "America/Los_Angeles",
    );
    const treatPct = Number(body.treatPercent ?? TREAT_SPLIT * 100);
    const futurePct = Number(body.futurePercent ?? FUTURE_SPLIT * 100);
    if (Math.round(treatPct + futurePct) !== 100) {
      return NextResponse.json(
        { error: "Treat + Future must equal 100%" },
        { status: 400 },
      );
    }
    if (treatPct < 0 || treatPct > 100) {
      return NextResponse.json(
        { error: "Treat share must be between 0% and 100%" },
        { status: 400 },
      );
    }
    const treatSplit = Math.round(treatPct) / 100;

    const seedRewards = Array.isArray(body.rewards) ? body.rewards : [];

    const state = await updateState((prev) => {
      if (prev.profile?.onboarded && !body.force) {
        const err = new Error("Already onboarded");
        (err as Error & { status: number }).status = 409;
        throw err;
      }

      // If admin claimed legacy state that is already onboarded, keep journey
      if (prev.profile?.onboarded) {
        return prev;
      }

      const today =
        startDate ||
        (prev.profile?.startDate) ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

      const runId = prev.profile?.currentRunId ?? newId("run");
      const rewards = [...(prev.rewards ?? [])];
      for (const r of seedRewards) {
        const name = String(r.name ?? "").trim();
        const estimatedCost = Number(r.estimatedCost ?? r.cost);
        if (!name || !Number.isFinite(estimatedCost)) continue;
        rewards.push({
          id: newId("reward"),
          name,
          category: (String(r.category || "other") as RewardCategory) || "other",
          estimatedCost,
          url: r.url ? String(r.url) : undefined,
          assignedMilestoneDay: r.milestoneDay
            ? Number(r.milestoneDay)
            : undefined,
          executed: false,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        rewards,
        profile: {
          id: prev.profile?.id ?? account.id,
          createdAt: prev.profile?.createdAt ?? account.createdAt,
          onboarded: true,
          displayName,
          historicalDailySpend,
          startDate: today,
          currentRunId: runId,
          currentRunStartedOn: prev.profile?.currentRunStartedOn ?? today,
          longTermTrackingCleared: true,
          supports: supports.map((s) => ({
            type: String(s.type),
            label: String(s.label).trim().slice(0, SUPPORT_LABEL_MAX) || "Support",
            weeklyTarget: Math.max(0, Math.min(21, Number(s.weeklyTarget) || 0)),
            enabled: s.enabled !== false,
          })),
          timezone,
          treatSplit,
          email: account.email,
          reminders: prev.profile?.reminders,
        },
      };
    });

    if (displayName !== account.displayName) {
      await updateUserRecord(account.id, (u) => ({ ...u, displayName }));
    }

    const refreshed = { ...account, displayName, state };
    await refreshSessionCookie(refreshed);

    return NextResponse.json({
      state,
      split: { future: 1 - treatSplit, treat: treatSplit },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    );
  }
}
