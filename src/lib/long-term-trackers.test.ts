import { describe, expect, it } from "vitest";
import { migrateLongTermTrackers } from "./long-term-trackers";
import { DEFAULT_SUPPORTS } from "./types";

describe("migrateLongTermTrackers", () => {
  it("clears legacy canned supports once, keeps medication", () => {
    const { supports, longTermTrackingCleared } = migrateLongTermTrackers(
      [
        ...DEFAULT_SUPPORTS,
        {
          type: "meditation",
          label: "Meditation",
          weeklyTarget: 5,
          enabled: true,
        },
        {
          type: "gym",
          label: "Gym",
          weeklyTarget: 4,
          enabled: true,
        },
        {
          type: "custom_floss",
          label: "Floss",
          weeklyTarget: 7,
          enabled: true,
        },
      ],
      false,
    );
    expect(longTermTrackingCleared).toBe(true);
    expect(supports.map((s) => s.type).sort()).toEqual(
      ["custom_floss", "medication"].sort(),
    );
  });

  it("does not re-strip after cleared flag", () => {
    const { supports } = migrateLongTermTrackers(
      [
        {
          type: "medication",
          label: "Medication",
          weeklyTarget: 7,
          enabled: true,
        },
        {
          type: "meditation",
          label: "Meditate",
          weeklyTarget: 5,
          enabled: true,
        },
      ],
      true,
    );
    expect(supports.map((s) => s.type).sort()).toEqual(
      ["medication", "meditation"].sort(),
    );
  });

  it("ensures medication exists", () => {
    const { supports } = migrateLongTermTrackers([], false);
    expect(supports).toEqual(DEFAULT_SUPPORTS);
  });
});
