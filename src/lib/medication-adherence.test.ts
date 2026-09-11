import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import { medicationAdherence } from "./medication-adherence";
import type { RebuildState, SupportCompletion } from "./types";

function withMed(
  dates: string[],
  opts?: { enabled?: boolean; label?: string },
): RebuildState {
  const state = emptyState();
  state.profile = {
    ...((state.profile ?? {}) as NonNullable<RebuildState["profile"]>),
    displayName: "Jeremy",
    timezone: "America/New_York",
    startDate: "2026-01-01",
    currentRunStartedOn: "2026-01-01",
    supports: [
      {
        type: "medication",
        label: opts?.label ?? "Medication",
        weeklyTarget: 7,
        enabled: opts?.enabled ?? true,
      },
    ],
  } as RebuildState["profile"];

  state.supports = dates.map(
    (date): SupportCompletion => ({
      date,
      supportType: "medication",
      completed: true,
      completedAt: `${date}T12:00:00.000Z`,
    }),
  );
  return state;
}

describe("medicationAdherence", () => {
  it("returns null percent when never taken", () => {
    const state = withMed([]);
    const a = medicationAdherence(state, "2026-09-11");
    expect(a.firstDoseDate).toBeNull();
    expect(a.percent).toBeNull();
    expect(a.daysCovered).toBe(0);
    expect(a.takenToday).toBe(false);
    expect(a.configured).toBe(true);
  });

  it("computes days covered from first dose through today inclusive", () => {
    // First dose Sep 1; taken Sep 1, 2, 4; today Sep 5 → 3/5 = 60%
    const state = withMed(["2026-09-01", "2026-09-02", "2026-09-04"]);
    const a = medicationAdherence(state, "2026-09-05");
    expect(a.firstDoseDate).toBe("2026-09-01");
    expect(a.daysElapsed).toBe(5);
    expect(a.daysCovered).toBe(3);
    expect(a.percent).toBe(60);
    expect(a.takenToday).toBe(false);
  });

  it("counts today when taken and is 100% for every day since first dose", () => {
    const state = withMed(["2026-09-09", "2026-09-10", "2026-09-11"]);
    const a = medicationAdherence(state, "2026-09-11");
    expect(a.daysElapsed).toBe(3);
    expect(a.daysCovered).toBe(3);
    expect(a.percent).toBe(100);
    expect(a.takenToday).toBe(true);
  });

  it("dedupes multiple completions on the same day", () => {
    const state = withMed(["2026-09-10", "2026-09-10"]);
    state.supports.push({
      date: "2026-09-10",
      supportType: "medication",
      completed: true,
      completedAt: "2026-09-10T18:00:00.000Z",
    });
    const a = medicationAdherence(state, "2026-09-11");
    expect(a.daysCovered).toBe(1);
    expect(a.daysElapsed).toBe(2);
    expect(a.percent).toBe(50);
  });
});
