import { describe, expect, it } from "vitest";
import {
  blankActualsFromRoutine,
  buildMonthGrid,
  formatExerciseActualSummary,
  formatWorkoutListDate,
  lastExerciseActualsForRoutine,
  monthWorkoutSummary,
  normalizeExerciseActuals,
  normalizeQuality,
  normalizeRoutines,
  normalizeWorkout,
  parseRoutineSelectValue,
  routineSelectValue,
  routinesForType,
  summarizeDay,
  weekRunMiles,
  weekWorkoutSummary,
  workoutsInMonth,
} from "./workouts";
import type { WorkoutLog } from "./types";

describe("normalizeWorkout", () => {
  it("defaults legacy rows to lift", () => {
    const w = normalizeWorkout({
      id: "1",
      date: "2026-08-30",
      label: "Leg day",
      createdAt: "2026-08-30T12:00:00Z",
    } as WorkoutLog);
    expect(w.type).toBe("lift");
  });

  it("migrates lift+hiit to hiit type", () => {
    const w = normalizeWorkout({
      id: "1",
      date: "2026-08-30",
      category: "lift",
      liftType: "hiit",
      label: "Tabata",
      createdAt: "2026-08-30T12:00:00Z",
    });
    expect(w.type).toBe("hiit");
  });

  it("preserves run with distance", () => {
    const w = normalizeWorkout({
      id: "2",
      date: "2026-08-30",
      category: "run",
      label: "Easy 5K",
      distanceMiles: 3.1,
      createdAt: "2026-08-30T12:00:00Z",
    });
    expect(w.type).toBe("run");
  });
});

describe("buildMonthGrid", () => {
  it("includes all days in August 2026", () => {
    const weeks = buildMonthGrid(2026, 8);
    const flat = weeks.flat().filter(Boolean);
    expect(flat[0]).toBe("2026-08-01");
    expect(flat.at(-1)).toBe("2026-08-31");
  });
});

describe("summarizeDay", () => {
  it("lists all four types on one day", () => {
    const s = summarizeDay([
      {
        id: "a",
        date: "2026-08-30",
        type: "run",
        label: "Run",
        createdAt: "",
      },
      {
        id: "b",
        date: "2026-08-30",
        type: "hiit",
        label: "HIIT",
        createdAt: "",
      },
    ]);
    expect(s.types).toEqual(["run", "hiit"]);
  });
});

describe("weekRunMiles", () => {
  it("sums run miles in the anchor week", () => {
    const miles = weekRunMiles(
      [
        {
          id: "1",
          date: "2026-08-30",
          type: "run",
          label: "Run",
          distanceMiles: 3,
          createdAt: "",
        },
        {
          id: "2",
          date: "2026-08-31",
          type: "run",
          label: "Run",
          distanceMiles: 2.5,
          createdAt: "",
        },
        {
          id: "3",
          date: "2026-08-30",
          type: "lift",
          label: "Lift",
          createdAt: "",
        },
      ],
      "2026-08-30",
    );
    expect(miles).toBe(5.5);
  });
});

describe("weekWorkoutSummary", () => {
  it("counts sessions by type and sums quality points", () => {
    const summary = weekWorkoutSummary(
      [
        {
          id: "1",
          date: "2026-08-30",
          type: "run",
          label: "Run",
          distanceMiles: 3,
          durationMin: 30,
          quality: 4,
          createdAt: "",
        },
        {
          id: "2",
          date: "2026-08-30",
          type: "hiit",
          label: "HIIT",
          durationMin: 20,
          quality: 5,
          createdAt: "",
        },
      ],
      "2026-08-30",
    );
    expect(summary.counts.run).toBe(1);
    expect(summary.counts.hiit).toBe(1);
    expect(summary.runMiles).toBe(3);
    expect(summary.totalMinutes).toBe(50);
    expect(summary.qualityPoints).toBe(9);
  });
});

describe("monthWorkoutSummary", () => {
  it("filters to the selected month", () => {
    const summary = monthWorkoutSummary(
      [
        {
          id: "1",
          date: "2026-08-01",
          type: "stretch",
          label: "Yoga",
          quality: 3,
          createdAt: "",
        },
        {
          id: "2",
          date: "2026-07-31",
          type: "stretch",
          label: "Yoga",
          quality: 5,
          createdAt: "",
        },
      ],
      2026,
      8,
    );
    expect(summary.counts.stretch).toBe(1);
    expect(summary.qualityPoints).toBe(3);
  });
});

describe("normalizeQuality", () => {
  it("clamps to 1–5", () => {
    expect(normalizeQuality(3)).toBe(3);
    expect(normalizeQuality(0)).toBeUndefined();
    expect(normalizeQuality(6)).toBeUndefined();
    expect(normalizeQuality("4")).toBe(4);
  });
});

describe("routines and actuals", () => {
  const routine = {
    id: "routine_1",
    name: "Upper",
    type: "lift" as const,
    exercises: [
      {
        id: "ex_1",
        name: "Bench",
        sets: 3,
        reps: 8,
        tracksWeight: true,
      },
      {
        id: "ex_2",
        name: "Push-ups",
        sets: 2,
        reps: 12,
        tracksWeight: false,
      },
    ],
    createdAt: "2026-08-30T12:00:00Z",
  };

  it("normalizes routines and filters by type", () => {
    const list = normalizeRoutines([
      routine,
      {
        id: "routine_2",
        name: "Flow",
        type: "stretch",
        exercises: [
          {
            id: "ex_3",
            name: "Hamstring",
            sets: 1,
            reps: 30,
            tracksWeight: false,
          },
        ],
        createdAt: "2026-08-30T12:00:00Z",
      },
    ]);
    expect(routinesForType(list, "lift")).toHaveLength(1);
    expect(routinesForType(list, "lift")[0].name).toBe("Upper");
  });

  it("seeds blank actuals from routine plan", () => {
    const actuals = blankActualsFromRoutine(routine);
    expect(actuals).toHaveLength(2);
    expect(actuals[0].sets).toHaveLength(3);
    expect(actuals[0].sets[0].reps).toBe(8);
    expect(actuals[0].tracksWeight).toBe(true);
    expect(actuals[0].sets[0].weight).toBeUndefined();
    expect(actuals[1].tracksWeight).toBe(false);
    expect(actuals[1].sets[0].weight).toBeUndefined();
  });

  it("defaults weights from the last logged session for that routine", () => {
    const previous = [
      {
        exerciseId: "ex_1",
        name: "Bench",
        tracksWeight: true,
        sets: [
          { reps: 8, weight: 135 },
          { reps: 8, weight: 140 },
          { reps: 6, weight: 145 },
        ],
      },
      {
        exerciseId: "ex_2",
        name: "Push-ups",
        tracksWeight: false,
        sets: [{ reps: 12 }, { reps: 12 }],
      },
    ];
    const actuals = blankActualsFromRoutine(routine, previous);
    expect(actuals[0].sets.map((s) => s.weight)).toEqual([135, 140, 145]);
    expect(actuals[0].sets[0].reps).toBe(8);
    expect(actuals[1].sets[0].weight).toBeUndefined();
  });

  it("matches previous weights by exercise name when ids differ", () => {
    const previous = [
      {
        exerciseId: "old_bench",
        name: "Bench",
        tracksWeight: true,
        sets: [
          { reps: 8, weight: 155 },
          { reps: 8, weight: 155 },
        ],
      },
    ];
    const actuals = blankActualsFromRoutine(routine, previous);
    expect(actuals[0].sets[0].weight).toBe(155);
    expect(actuals[0].sets[1].weight).toBe(155);
    expect(actuals[0].sets[2].weight).toBeUndefined();
  });

  it("finds the newest routine session for last weights", () => {
    const logs: WorkoutLog[] = [
      {
        id: "older",
        date: "2026-09-01",
        label: "Upper",
        type: "lift",
        routineId: "routine_1",
        exerciseActuals: [
          {
            exerciseId: "ex_1",
            name: "Bench",
            tracksWeight: true,
            sets: [{ reps: 8, weight: 100 }],
          },
        ],
        createdAt: "2026-09-01T12:00:00Z",
      },
      {
        id: "newer",
        date: "2026-09-10",
        label: "Upper",
        type: "lift",
        routineId: "routine_1",
        exerciseActuals: [
          {
            exerciseId: "ex_1",
            name: "Bench",
            tracksWeight: true,
            sets: [
              { reps: 8, weight: 135 },
              { reps: 8, weight: 140 },
              { reps: 6, weight: 145 },
            ],
          },
        ],
        createdAt: "2026-09-10T12:00:00Z",
      },
      {
        id: "other",
        date: "2026-09-12",
        label: "HIIT circuit",
        type: "hiit",
        routineId: "routine_hiit",
        exerciseActuals: [
          {
            exerciseId: "ex_kb",
            name: "KB swing",
            tracksWeight: true,
            sets: [{ reps: 15, weight: 35 }],
          },
        ],
        createdAt: "2026-09-12T12:00:00Z",
      },
    ];
    const last = lastExerciseActualsForRoutine(logs, "routine_1");
    expect(last?.[0].sets[0].weight).toBe(135);
    expect(lastExerciseActualsForRoutine(logs, "missing")).toBeUndefined();
  });

  it("preserves seconds rep mode on routines and actuals", () => {
    const timed = normalizeRoutines([
      {
        id: "routine_stretch",
        name: "Mobility",
        type: "stretch",
        exercises: [
          {
            id: "ex_hold",
            name: "Pigeon hold",
            sets: 2,
            reps: 45,
            repMode: "seconds",
            tracksWeight: false,
          },
        ],
        createdAt: "2026-08-30T12:00:00Z",
      },
    ])[0];
    expect(timed.exercises[0].repMode).toBe("seconds");
    const actuals = blankActualsFromRoutine(timed);
    expect(actuals[0].repMode).toBe("seconds");
    expect(formatExerciseActualSummary(actuals)).toContain("45s");
  });

  it("formats actual summaries and strips weight when not tracked", () => {
    const actuals = normalizeExerciseActuals([
      {
        exerciseId: "ex_1",
        name: "Bench",
        tracksWeight: true,
        sets: [
          { reps: 8, weight: 135 },
          { reps: 6, weight: 145 },
        ],
      },
      {
        exerciseId: "ex_2",
        name: "Push-ups",
        tracksWeight: false,
        sets: [{ reps: 12, weight: 999 }],
      },
    ]);
    expect(actuals?.[1].sets[0].weight).toBeUndefined();
    expect(formatExerciseActualSummary(actuals)).toContain("Bench 8×135, 6×145");
    expect(formatExerciseActualSummary(actuals)).toContain("Push-ups 12");
  });

  it("parses routine select values", () => {
    expect(parseRoutineSelectValue(routineSelectValue("abc"))).toBe("abc");
    expect(parseRoutineSelectValue("Upper body")).toBeNull();
  });
});

describe("workout history list", () => {
  it("formats MM/DD and lists month workouts newest first", () => {
    const logs: WorkoutLog[] = [
      {
        id: "a",
        date: "2026-09-01",
        label: "Stretch 1",
        type: "stretch",
        createdAt: "2026-09-01T12:00:00Z",
      },
      {
        id: "b",
        date: "2026-08-28",
        label: "Easy run",
        type: "run",
        createdAt: "2026-08-28T12:00:00Z",
      },
    ];
    expect(formatWorkoutListDate("2026-09-01")).toBe("09/01");
    expect(workoutsInMonth(logs, "2026-09").map((w) => w.id)).toEqual(["a"]);
  });
});
