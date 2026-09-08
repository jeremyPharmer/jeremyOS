import { NextResponse } from "next/server";
import { normalizeReminders } from "@/lib/reminders";
import { INTERVENTION_LABEL_MAX } from "@/lib/craving-interventions";
import { updateState } from "@/lib/store";
import { optionalTaskGroup, type CalendarFeedGroups } from "@/lib/task-groups";
import { DEFAULT_SUPPORTS, type SupportConfig } from "@/lib/types";
import { normalizeExtraIcalUrls } from "@/lib/work-calendar";

function normalizeCalendarFeedGroups(raw: unknown): CalendarFeedGroups | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const out: CalendarFeedGroups = {};
  const personal = optionalTaskGroup(obj.personal);
  const work = optionalTaskGroup(obj.work);
  const google = optionalTaskGroup(obj.google);
  if (personal) out.personal = personal;
  if (work) out.work = work;
  if (google) out.google = google;
  if (Array.isArray(obj.extra)) {
    out.extra = obj.extra.map((g) => optionalTaskGroup(g));
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = await updateState((prev) => {
      if (!prev.profile) {
        const err = new Error("Not onboarded");
        (err as Error & { status: number }).status = 400;
        throw err;
      }
      const supports: SupportConfig[] = Array.isArray(body.supports)
        ? body.supports
        : prev.profile.supports ?? DEFAULT_SUPPORTS;
      const cravingInterventions = Array.isArray(body.cravingInterventions)
        ? body.cravingInterventions
            .map((s: unknown) => String(s).trim().slice(0, INTERVENTION_LABEL_MAX))
            .filter(Boolean)
        : prev.profile.cravingInterventions;
      const historicalDailySpend =
        body.historicalDailySpend !== undefined
          ? Number(body.historicalDailySpend)
          : prev.profile.historicalDailySpend;

      const email =
        body.email !== undefined
          ? String(body.email || "").trim() || undefined
          : prev.profile.email;

      const personalIcalUrl =
        body.personalIcalUrl !== undefined
          ? String(body.personalIcalUrl || "").trim().slice(0, 2000) ||
            undefined
          : prev.profile.personalIcalUrl;

      const workIcalUrl =
        body.workIcalUrl !== undefined
          ? String(body.workIcalUrl || "").trim().slice(0, 2000) || undefined
          : prev.profile.workIcalUrl;

      const extraIcalUrls =
        body.extraIcalUrls !== undefined
          ? normalizeExtraIcalUrls(body.extraIcalUrls)
          : prev.profile.extraIcalUrls;

      const calendarFeedGroups =
        body.calendarFeedGroups !== undefined
          ? normalizeCalendarFeedGroups(body.calendarFeedGroups)
          : prev.profile.calendarFeedGroups;

      const reminders =
        body.reminders !== undefined
          ? normalizeReminders({
              enabled: Boolean(
                body.reminders.morningEnabled ??
                  body.reminders.eveningEnabled ??
                  body.reminders.enabled,
              ),
              morningEnabled:
                body.reminders.morningEnabled !== undefined
                  ? Boolean(body.reminders.morningEnabled)
                  : Boolean(body.reminders.enabled),
              eveningEnabled:
                body.reminders.eveningEnabled !== undefined
                  ? Boolean(body.reminders.eveningEnabled)
                  : Boolean(body.reminders.enabled),
              morningHour: Number(body.reminders.morningHour),
              eveningHour: Number(body.reminders.eveningHour),
            })
          : prev.profile.reminders
            ? normalizeReminders(prev.profile.reminders)
            : undefined;

      if (reminders?.enabled && !email) {
        const err = new Error("Add an email before enabling reminders");
        (err as Error & { status: number }).status = 400;
        throw err;
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          supports,
          cravingInterventions,
          historicalDailySpend,
          displayName: body.displayName
            ? String(body.displayName)
            : prev.profile.displayName,
          email,
          personalIcalUrl,
          workIcalUrl,
          extraIcalUrls,
          calendarFeedGroups,
          reminders,
        },
      };
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
