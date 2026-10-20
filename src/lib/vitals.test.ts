import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  VITALS_NOTE_MAX,
  addVitalsReading,
  filledVitalsPointsInRange,
  normalizeVitalsNote,
  parseVitalsInput,
  removeVitalsReading,
  vitalsTrendPointsInRange,
} from "./vitals";

describe("parseVitalsInput", () => {
  it("requires date, period, and all three numbers", () => {
    expect(parseVitalsInput({}).ok).toBe(false);
    expect(
      parseVitalsInput({
        date: "2026-09-10",
        period: "am",
        systolic: 120,
        diastolic: 80,
        heartRate: 72,
      }),
    ).toEqual({
      ok: true,
      date: "2026-09-10",
      period: "am",
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
    });
  });

  it("rejects systolic <= diastolic", () => {
    const r = parseVitalsInput({
      date: "2026-09-10",
      period: "pm",
      systolic: 80,
      diastolic: 90,
      heartRate: 70,
    });
    expect(r.ok).toBe(false);
  });

  it("accepts an optional one-line note", () => {
    const r = parseVitalsInput({
      date: "2026-09-10",
      period: "am",
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      note: "  after coffee  ",
    });
    expect(r).toEqual({
      ok: true,
      date: "2026-09-10",
      period: "am",
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      note: "after coffee",
    });
  });
});

describe("normalizeVitalsNote", () => {
  it("trims, collapses space, and clamps length", () => {
    expect(normalizeVitalsNote("  hi   there  ")).toBe("hi there");
    expect(normalizeVitalsNote("   ")).toBeUndefined();
    expect(normalizeVitalsNote("x".repeat(100))?.length).toBe(VITALS_NOTE_MAX);
  });
});

describe("add / remove vitals", () => {
  it("replaces same date+period and removes by id", () => {
    let state = emptyState();
    state = addVitalsReading(state, {
      date: "2026-09-10",
      period: "am",
      systolic: 118,
      diastolic: 76,
      heartRate: 68,
      note: "morning",
    });
    expect(state.vitals).toHaveLength(1);
    expect(state.vitals![0]!.note).toBe("morning");
    state = addVitalsReading(state, {
      date: "2026-09-10",
      period: "am",
      systolic: 122,
      diastolic: 78,
      heartRate: 70,
      note: "recheck",
    });
    expect(state.vitals).toHaveLength(1);
    expect(state.vitals![0]!.systolic).toBe(122);
    expect(state.vitals![0]!.note).toBe("recheck");
    state = addVitalsReading(state, {
      date: "2026-09-10",
      period: "pm",
      systolic: 124,
      diastolic: 80,
      heartRate: 74,
    });
    expect(state.vitals).toHaveLength(2);
    const id = state.vitals![0]!.id;
    state = removeVitalsReading(state, id);
    expect(state.vitals).toHaveLength(1);
  });
});

describe("vitalsTrendPointsInRange", () => {
  it("prefers PM when both periods exist that day", () => {
    let state = emptyState();
    state = addVitalsReading(state, {
      date: "2026-09-10",
      period: "am",
      systolic: 110,
      diastolic: 70,
      heartRate: 60,
    });
    state = addVitalsReading(state, {
      date: "2026-09-10",
      period: "pm",
      systolic: 125,
      diastolic: 82,
      heartRate: 75,
    });
    const points = vitalsTrendPointsInRange(state, "2026-09-10", "2026-09-10");
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      systolic: 125,
      diastolic: 82,
      heartRate: 75,
    });
  });

  it("trims empty edges for filled series", () => {
    let state = emptyState();
    state = addVitalsReading(state, {
      date: "2026-09-12",
      period: "am",
      systolic: 120,
      diastolic: 80,
      heartRate: 70,
    });
    const filled = filledVitalsPointsInRange(state, "2026-09-10", "2026-09-14");
    expect(filled.map((p) => p.date)).toEqual(["2026-09-12"]);
  });
});
