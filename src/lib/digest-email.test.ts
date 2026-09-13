import { describe, expect, it } from "vitest";
import { buildEveningDigest, buildMorningDigest } from "./digest-email";
import { emptyState } from "./journey";
import { DEFAULT_SUPPORTS } from "./types";
import type { RebuildState } from "./types";

function sample(): RebuildState {
  const state = emptyState();
  state.profile = {
    id: "u",
    createdAt: "",
    onboarded: true,
    displayName: "Jeremy",
    historicalDailySpend: 40,
    startDate: "2026-08-10",
    currentRunId: "run_1",
    currentRunStartedOn: "2026-08-10",
    supports: DEFAULT_SUPPORTS,
    timezone: "America/New_York",
    email: "j@example.com",
  };
  state.fund = { future: 21, treat: 49 };
  state.rewards = [
    {
      id: "r1",
      name: "NFL Bets",
      category: "entertainment",
      estimatedCost: 50,
      createdAt: "",
      executed: false,
    },
  ];
  state.supports = [
    {
      date: "2026-08-17",
      supportType: "medication",
      completed: true,
      completedAt: "2026-08-17T12:00:00.000Z",
    },
    {
      date: "2026-08-16",
      supportType: "medication",
      completed: true,
      completedAt: "2026-08-16T12:00:00.000Z",
    },
  ];
  state.mornings = [
    {
      date: "2026-08-17",
      sleepHours: 7,
      sleepQuality: 7,
      mood: 7,
      energy: 7,
      stress: 3,
      intention: "Stay present",
      completedAt: "2026-08-17T12:00:00.000Z",
    },
  ];
  return state;
}

describe("digest emails", () => {
  it("morning subject is streak-first and Today uses stacked week counts", () => {
    const digest = buildMorningDigest(sample(), "2026-08-17");
    expect(digest.subject).toBe("Day 8 is waiting");
    expect(digest.html).toContain("Start the day still open");
    expect(digest.html).toContain("2 / 7 this week");
    expect(digest.html).toContain("Medication");
    expect(digest.html).toContain("NFL Bets");
    expect(digest.html).toContain("Start the day — keep Day 8");
    expect(digest.html).toContain("to play");
    expect(digest.html).toContain("to read");
  });

  it("evening is close-focused with look-back copy", () => {
    const digest = buildEveningDigest(sample(), "2026-08-17");
    expect(digest.subject).toBe("Close Day 8");
    expect(digest.html).toContain("look back on the day");
    expect(digest.html).toContain("Don’t forget to close it");
    expect(digest.html).toContain("Stay present");
    expect(digest.html).toContain("Close the day");
    expect(digest.html).toContain("2 / 7 this week");
    expect(digest.html).not.toContain("5 to play");
  });
});
