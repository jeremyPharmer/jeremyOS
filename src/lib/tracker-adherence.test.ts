import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import { longTermTrackerAdherenceList, trackerAdherence } from "./tracker-adherence";
import type { RebuildState, SupportCompletion } from "./types";

function withTrackers(
  trackers: { type: string; label: string; weeklyTarget: number }[],
  logs: { date: string; type: string }[],
): RebuildState {
  const state = emptyState();
  state.profile = {
    ...((state.profile ?? {}) as NonNullable<RebuildState["profile"]>),
    displayName: "Jeremy",
    timezone: "America/New_York",
    startDate: "2026-01-01",
    currentRunStartedOn: "2026-01-01",
    supports: trackers.map((t) => ({ ...t, enabled: true })),
  } as RebuildState["profile"];
  state.supports = logs.map(
    (l): SupportCompletion => ({
      date: l.date,
      supportType: l.type,
      completed: true,
      completedAt: `${l.date}T12:00:00.000Z`,
    }),
  );
  return state;
}

describe("trackerAdherence", () => {
  it("treats 7/wk like days covered", () => {
    const state = withTrackers(
      [{ type: "medication", label: "Medication", weeklyTarget: 7 }],
      [
        { date: "2026-09-01", type: "medication" },
        { date: "2026-09-02", type: "medication" },
        { date: "2026-09-04", type: "medication" },
      ],
    );
    const row = trackerAdherence(
      state,
      state.profile!.supports[0]!,
      "2026-09-05",
    );
    expect(row.daysElapsed).toBe(5);
    expect(row.completed).toBe(3);
    expect(row.expected).toBe(5);
    expect(row.percent).toBe(60);
  });

  it("scales expected by weekly frequency", () => {
    const state = withTrackers(
      [{ type: "custom_floss", label: "Floss", weeklyTarget: 3 }],
      [
        { date: "2026-09-01", type: "custom_floss" },
        { date: "2026-09-03", type: "custom_floss" },
        { date: "2026-09-05", type: "custom_floss" },
      ],
    );
    const row = trackerAdherence(
      state,
      state.profile!.supports[0]!,
      "2026-09-14",
    );
    // 14 days * 3/7 = 6 expected
    expect(row.daysElapsed).toBe(14);
    expect(row.expected).toBe(6);
    expect(row.completed).toBe(3);
    expect(row.percent).toBe(50);
  });

  it("lists only enabled trackers", () => {
    const state = withTrackers(
      [
        { type: "medication", label: "Medication", weeklyTarget: 7 },
        { type: "custom_walk", label: "Walk", weeklyTarget: 4 },
      ],
      [],
    );
    state.profile!.supports[1]!.enabled = false;
    const list = longTermTrackerAdherenceList(state, "2026-09-12");
    expect(list.map((r) => r.type)).toEqual(["medication"]);
  });
});
