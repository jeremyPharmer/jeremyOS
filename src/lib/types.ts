import type { CalendarFeedGroups, TaskGroup } from "./task-groups";

export type AlignmentStatus = "aligned" | "return_to_use" | "other";

/** Built-in or custom support id (e.g. "gym", "custom_walk") */
export type SupportType = string;

export type SupportConfig = {
  type: SupportType;
  label: string;
  weeklyTarget: number;
  enabled: boolean;
};

export type MilestoneType = "checkpoint" | "reward" | "destination";

export type MilestoneDef = {
  dayNumber: number;
  type: MilestoneType;
  title: string;
  reflectionPrompt?: string;
};

export type RewardCategory =
  | "clothing"
  | "wellness"
  | "experiences"
  | "growth"
  | "travel"
  | "food"
  | "entertainment"
  | "other";

export type MorningCheckIn = {
  date: string;
  /** Subjective sleep amount 1–10 (legacy rows may be clock hours). */
  sleepHours: number;
  sleepQuality: number;
  mood: number;
  energy: number;
  stress: number;
  /** @deprecated removed from morning UI; prefer craving events */
  craving?: number;
  /** @deprecated RB-027 dropped daily intention; empty on new check-ins */
  intention: string;
  trigger?: string;
  notes?: string;
  /** Quote shown on the day-start briefing screen */
  quoteId?: string;
  completedAt: string;
};

export type WorkoutType = "run" | "hiit" | "lift" | "stretch";

/** @deprecated legacy category + liftType — migrated to `type` on read */
export type WorkoutCategory = "run" | "lift";
/** @deprecated legacy lift subtype — migrated to `type` on read */
export type LiftType = "hiit" | "stretch" | "weights";

/** Planned exercise inside a saved routine (weights flag fixed at setup) */
export type WorkoutRepMode = "reps" | "seconds";

export type WorkoutRoutineExercise = {
  id: string;
  name: string;
  sets: number;
  /** Target reps or seconds per set, depending on `repMode` */
  reps: number;
  repMode?: WorkoutRepMode;
  /** If true, weight is collected when logging — not toggled mid-session */
  tracksWeight: boolean;
};

/** Named reusable workout (stretch, lift, etc.) */
export type WorkoutRoutine = {
  id: string;
  name: string;
  type: WorkoutType;
  exercises: WorkoutRoutineExercise[];
  createdAt: string;
  updatedAt?: string;
};

/** One set performed in a logged session */
export type WorkoutSetActual = {
  reps: number;
  /** Present only when the exercise tracks weight */
  weight?: number;
};

/** Snapshot of an exercise + performed sets (retained for history) */
export type WorkoutExerciseActual = {
  exerciseId: string;
  name: string;
  tracksWeight: boolean;
  repMode?: WorkoutRepMode;
  sets: WorkoutSetActual[];
};

/** Personal workout log entry (RB-018) */
export type WorkoutLog = {
  id: string;
  date: string;
  type?: WorkoutType;
  /** @deprecated use `type` */
  category?: WorkoutCategory;
  /** @deprecated use `type` */
  liftType?: LiftType;
  label: string;
  /** Session quality 1–5; counts as weekly points */
  quality?: number;
  durationMin?: number;
  /** Run distance in miles — MapMyRun sync later */
  distanceMiles?: number;
  notes?: string;
  /** Saved routine this log was based on */
  routineId?: string;
  /** Performed sets/reps/(weights) retained for tracking */
  exerciseActuals?: WorkoutExerciseActual[];
  createdAt: string;
};

export type WorkoutPr = {
  id: string;
  type?: WorkoutType;
  /** @deprecated use `type` */
  category?: WorkoutCategory;
  /** @deprecated use `type` */
  liftType?: LiftType;
  /** e.g. 5K, Bench press, Longest run */
  name: string;
  value: number;
  unit: string;
  date: string;
  workoutId?: string;
  notes?: string;
  createdAt: string;
};

/** When a Google-style repeat series stops (no alerts). */
export type TodoRepeatEnds =
  | { type: "never" }
  | { type: "on"; date: string }
  | { type: "after"; count: number };

/**
 * Recurrence for personal tasks.
 * Legacy kinds kept for stored data; new UI writes `repeat` (Google Tasks–style).
 */
export type TodoRecurrence =
  | { kind: "none" }
  | { kind: "daily" }
  | { kind: "weekly"; weekdays: number[] }
  | { kind: "every_n_days"; n: number }
  | { kind: "monthly_first" }
  | {
      kind: "repeat";
      /** Unit to repeat on */
      frequency: "day" | "week" | "month" | "year";
      /** Every N units (≥ 1) */
      interval: number;
      /** For frequency=week: days of week (0=Sun…6=Sat) */
      weekdays?: number[];
      /** For frequency=month: same calendar day vs nth weekday */
      monthlyOn?: "day" | "nth_weekday";
      ends?: TodoRepeatEnds;
    };

/**
 * Personal to-do (Today’s Items). Stored as `dayProvisions`.
 * `date` is the next due calendar day. One-off done sets `completed`.
 * Recurring stays open and advances `date` after each complete.
 * Life-area `group` is required on create (RB-026); legacy rows assign-on-edit.
 */
export type DayProvision = {
  id: string;
  date: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  recurrence?: TodoRecurrence;
  /** Optional due time HH:mm (24h). Omit for date-only. */
  time?: string;
  /** Completions so far (for ends.after). */
  repeatCount?: number;
  /** Last occurrence completed (YYYY-MM-DD); undo for recurring. */
  lastCompletedOn?: string;
  /**
   * Life-area group (RB-026): real_estate | family | home | work.
   * Required for new tasks; optional on legacy until edit.
   */
  group?: TaskGroup;
  /** No due date — listed under “No date” within group on Tasks page. */
  undated?: boolean;
};

export type EveningCheckIn = {
  date: string;
  mood: number;
  /** Evening stress 1–10; optional on legacy rows */
  stress?: number;
  /** @deprecated removed from evening UI; use craving flow events */
  craving?: number;
  /**
   * Always "aligned" for new closes (reclaim always).
   * Legacy rows may be return_to_use / other. Journey reset lives in Settings.
   */
  alignment: AlignmentStatus;
  returnNotes?: string;
  oneLine: string;
  /** Optional “anything specific stand out today?” note */
  expandedJournal?: string;
  completedAt: string;
};

export type SupportCompletion = {
  date: string;
  supportType: SupportType;
  completed: boolean;
  notes?: string;
  /** For recovery content: what will you do differently? */
  actionNote?: string;
  completedAt: string;
};

/** Support type, or morning/evening check-in */
export type SkipItemKey = SupportType | "morning" | "evening";

/** Dismiss a Today's Rebuild item for a calendar day */
export type DailySkip = {
  date: string;
  itemKey: SkipItemKey;
  skippedAt: string;
};

export type ReclaimDay = {
  date: string;
  estimatedAmount: number;
  accounted: boolean;
  reclaimedAmount?: number;
  confirmedAt?: string;
  transferId?: string;
};

export type FinancialTransfer = {
  id: string;
  amount: number;
  date: string;
  dayDates: string[];
  userConfirmed: boolean;
  note?: string;
  createdAt: string;
  /** Split applied at confirm time */
  split?: { future: number; treat: number; rebuild?: number };
};

/** Balances still set aside (must match external total) */
export type FundLedger = {
  future: number;
  treat: number;
  /** @deprecated folded into future on normalize — two-bucket model */
  rebuild?: number;
};

export type MilestoneDecision = {
  id: string;
  milestoneAchievementId: string;
  dayNumber: number;
  choice: "save" | "treat";
  /** Save: $ moved into Treat. Treat: $ spent from Treat (0 = celebration-only). */
  amount: number;
  rewardId?: string;
  note?: string;
  /** Optional celebration photo id under .data/photos */
  photoId?: string;
  createdAt: string;
};

export type Reward = {
  id: string;
  name: string;
  category: RewardCategory;
  estimatedCost: number;
  actualCost?: number;
  assignedMilestoneDay?: number;
  /** Optional link to buy / view the reward */
  url?: string;
  executed: boolean;
  executedAt?: string;
  notes?: string;
  /** Optional celebration photo id under .data/photos */
  photoId?: string;
  createdAt: string;
};

export type MilestoneAchievement = {
  id: string;
  dayNumber: number;
  title: string;
  type: MilestoneType;
  runId: string;
  cleanDaysAtAchieve: number;
  achievedAt: string;
  reflection?: string;
  rewardEligible: boolean;
};

export type ReturnEvent = {
  id: string;
  date: string;
  notes?: string;
  previousCleanDays: number;
  runIdEnded: string;
  createdAt: string;
};

export type CravingEvent = {
  id: string;
  at: string;
  intensityBefore: number;
  intensityAfter?: number;
  situation: string;
  intervention: string;
  /** @deprecated use outcomes — kept for legacy rows */
  outcome?: string;
  /** One or more interventions the user tried */
  outcomes?: string[];
};

export type WeeklyBonus = {
  id: string;
  weekStart: string;
  amount: number;
  confirmed: boolean;
  confirmedAt?: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  type: "one_line" | "journal" | "progress_note" | "life_event";
  text: string;
  tags?: string[];
  /** Optional attached photo (RB-021); served via /api/photos/[id] */
  photoId?: string;
  createdAt: string;
};

export type ReminderPrefs = {
  /** Either Start or Close is on (derived). */
  enabled: boolean;
  morningEnabled: boolean;
  eveningEnabled: boolean;
  /** Local hour 0–23 in profile.timezone */
  morningHour: number;
  /** Local hour 0–23 in profile.timezone */
  eveningHour: number;
};

export type RebuildProfile = {
  id: string;
  createdAt: string;
  onboarded: boolean;
  displayName: string;
  /** Combined historical daily spend for cannabis + alcohol */
  historicalDailySpend: number;
  startDate: string;
  /** Current run id; changes after return-to-use */
  currentRunId: string;
  currentRunStartedOn: string;
  supports: SupportConfig[];
  timezone: string;
  /**
   * Treat Yourself share of each Move (0–1). Future = 1 − treatSplit.
   * Set at onboarding; defaults to 0.7 when missing (legacy).
   */
  treatSplit?: number;
  /** Where morning/evening reminder emails go */
  email?: string;
  reminders?: ReminderPrefs;
  /**
   * Secret Apple Calendar / iCal subscribe URL (Settings).
   * Calendar events — not to-dos (RB-023).
   */
  personalIcalUrl?: string;
  /**
   * Secret Google Calendar iCal URL for work (Settings).
   * Calendar events — not to-dos (RB-023).
   * Superseded by Google OAuth on the user account when connected.
   */
  workIcalUrl?: string;
  /**
   * Extra secret iCal subscribe URLs (Settings — Add another calendar).
   * Merged into the same Home agenda as personal / work feeds.
   */
  extraIcalUrls?: string[];
  /**
   * Default life-area group per calendar feed (RB-026).
   * Events inherit color on Home agenda; per-event override on first open/edit.
   */
  calendarFeedGroups?: CalendarFeedGroups;
  /** User-added craving intervention labels (merged with defaults in the craving flow) */
  cravingInterventions?: string[];
};

export type GoogleCalendarLink = {
  connectedAt: string;
  accountEmail?: string;
  /** Calendar id, e.g. `primary` */
  calendarId: string;
  refreshToken: string;
};

export type RebuildState = {
  profile: RebuildProfile | null;
  mornings: MorningCheckIn[];
  evenings: EveningCheckIn[];
  supports: SupportCompletion[];
  reclaimDays: ReclaimDay[];
  transfers: FinancialTransfer[];
  rewards: Reward[];
  milestones: MilestoneAchievement[];
  returns: ReturnEvent[];
  cravings: CravingEvent[];
  weeklyBonuses: WeeklyBonus[];
  journals: JournalEntry[];
  /** Personal “day to remember” bookmarks (YYYY-MM-DD), no cap */
  starredDays?: string[];
  /** Today's Rebuild items dismissed for a given date */
  skips: DailySkip[];
  /** Segmented balances still set aside */
  fund: FundLedger;
  /** Consecutive Save choices since last Treat (max 2, then forced Treat) */
  consecutiveSaves: number;
  milestoneDecisions: MilestoneDecision[];
  /** Last local dates a reminder email was sent (YYYY-MM-DD) */
  reminderLog?: { morning?: string; evening?: string };
  /** Podcast/article ids marked heard or read — never offered again */
  listenedPodcasts?: string[];
  /** Personal to-dos (Today’s Items); `date` is next due day */
  dayProvisions?: DayProvision[];
  /** Morning quotes already shown (avoid reuse for ~1 year) */
  quoteLog?: { quoteId: string; usedOn: string }[];
  /** Gym / workout log */
  workouts?: WorkoutLog[];
  /** Personal records — run + lift */
  workoutPrs?: WorkoutPr[];
  /** Saved named routines (templates) */
  workoutRoutines?: WorkoutRoutine[];
  /** Home agenda display titles keyed by calendar event id */
  calendarTitleOverrides?: Record<string, string>;
  /** Per-event life-area group overrides for imported calendar events (RB-026) */
  calendarEventGroups?: Record<string, TaskGroup>;
  /** Home agenda events hidden locally (ICS feed can lag after phone delete) */
  calendarHiddenEventIds?: string[];
  /** Jeremy-added reminders/events on Home calendar (local only) */
  customAgendaEvents?: CustomAgendaEvent[];
  /** Daily mini crossword — attempts/completed + today’s grid */
  dailyCrossword?: {
    attempts: number;
    completed: number;
    current?: {
      date: string;
      started: boolean;
      solved: boolean;
      /** Gave up — answers revealed; locked, not a win */
      revealed?: boolean;
      cells: string[];
    };
  };
};

export type CustomAgendaEvent = {
  id: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  title: string;
  allDay?: boolean;
  /** Display label, e.g. "3:00 PM" */
  startTime?: string;
  endTime?: string;
  note?: string;
  createdAt: string;
  /** Life-area group (RB-026); required on create */
  group?: TaskGroup;
};

export const DEFAULT_SUPPORTS: SupportConfig[] = [
  {
    type: "recovery_content",
    label: "Recovery content",
    weeklyTarget: 2,
    enabled: true,
  },
  {
    type: "meditation",
    label: "Meditation",
    weeklyTarget: 5,
    enabled: true,
  },
  {
    type: "medication",
    label: "Medication",
    weeklyTarget: 7,
    enabled: true,
  },
  {
    type: "gym",
    label: "Gym",
    weeklyTarget: 4,
    enabled: true,
  },
];

export const MILESTONE_DEFS: MilestoneDef[] = [
  { dayNumber: 1, type: "checkpoint", title: "Begin" },
  { dayNumber: 2, type: "checkpoint", title: "Keep Going" },
  { dayNumber: 3, type: "reward", title: "First Win" },
  { dayNumber: 5, type: "checkpoint", title: "Momentum" },
  { dayNumber: 7, type: "reward", title: "One Week" },
  { dayNumber: 10, type: "checkpoint", title: "Finding Your Rhythm" },
  { dayNumber: 14, type: "reward", title: "Two Weeks" },
  { dayNumber: 21, type: "checkpoint", title: "Three Weeks" },
  {
    dayNumber: 30,
    type: "destination",
    title: "One Month",
    reflectionPrompt: "What is different about your life compared with Day 1?",
  },
  { dayNumber: 45, type: "reward", title: "Six Weeks" },
  { dayNumber: 60, type: "reward", title: "Two Months" },
  { dayNumber: 75, type: "reward", title: "Checkpoint Reward" },
  {
    dayNumber: 90,
    type: "destination",
    title: "Three-Month Destination",
    reflectionPrompt: "What are you building that you couldn't see at the beginning?",
  },
  { dayNumber: 105, type: "reward", title: "Next Horizon" },
  { dayNumber: 120, type: "reward", title: "Four Months" },
  { dayNumber: 150, type: "reward", title: "Five Months" },
  {
    dayNumber: 180,
    type: "destination",
    title: "Six-Month Destination",
    reflectionPrompt: "What are you no longer willing to give up?",
  },
  { dayNumber: 210, type: "reward", title: "Seven Months" },
  { dayNumber: 240, type: "reward", title: "Eight Months" },
  { dayNumber: 270, type: "destination", title: "Major Destination" },
  { dayNumber: 300, type: "reward", title: "Ten Months" },
  { dayNumber: 330, type: "reward", title: "Eleven Months" },
  {
    dayNumber: 365,
    type: "destination",
    title: "One Year",
    reflectionPrompt: "What did you build?",
  },
];
