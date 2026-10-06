"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  activeSaveGoals,
  amountToGo,
  dailyIncomeRate,
  floorDollar,
  formatCalendarMonthLabel,
  formatMoney,
  formatMoneyDown,
  formatTargetDateLabel,
  groupSaveGoalClosesByMonth,
  inboundPercent,
  leftoverBeforeApply,
  listSaveGoalAdjustments,
  listSaveGoalAdjustmentsForGoal,
  listSaveGoalSpendEntries,
  normalizeSaveGoalSettings,
  progressRatio,
  projectSaveGoalTargetDate,
  round2,
  SAVE_GOAL_LEDGER_START,
  SAVE_GOAL_SPEND_CATEGORIES,
  saveGoalCloseForDate,
  saveGoalSpendEntryLabel,
  spendCategoryLabelsForDate,
  splitPoolByWeight,
  type SaveGoalMonthSummary,
} from "@/lib/save-goals";
import type {
  SaveGoal,
  SaveGoalDay,
  SaveGoalSpendCategory,
} from "@/lib/types";

const NAME_PRESETS = ["Trip", "Gift", "General saving"] as const;
const PCT_STEP = 1;

function GoalPercentControls({
  percent,
  busy,
  label,
  onChange,
}: {
  percent: number;
  busy: boolean;
  label: string;
  onChange: (next: number) => void;
}) {
  const rounded = Math.round(percent);
  const [draft, setDraft] = useState(String(rounded));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(rounded));
  }, [rounded, focused]);

  function commit(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setDraft(String(rounded));
      return;
    }
    const clamped = Math.min(100, Math.max(0, Math.round(n)));
    setDraft(String(clamped));
    if (clamped !== rounded) onChange(clamped);
  }

  return (
    <div className="save-goal-pct" aria-label={`${label} daily inbound`}>
      <span className="save-goal-pct-name">{label}</span>
      <button
        type="button"
        className="save-goal-pct-btn"
        disabled={busy || rounded <= 0}
        aria-label={`Decrease ${label} percent`}
        onClick={() => onChange(Math.max(0, rounded - PCT_STEP))}
      >
        −
      </button>
      <input
        className="save-goal-pct-input"
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        disabled={busy}
        value={draft}
        aria-label={`${label} inbound percent`}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <span className="save-goal-pct-suffix">%</span>
      <button
        type="button"
        className="save-goal-pct-btn"
        disabled={busy || rounded >= 100}
        aria-label={`Increase ${label} percent`}
        onClick={() => onChange(Math.min(100, rounded + PCT_STEP))}
      >
        +
      </button>
    </div>
  );
}

function InboundBreakdown({
  goals,
  busy,
  onPercentChange,
}: {
  goals: SaveGoal[];
  busy: boolean;
  onPercentChange: (id: string, percent: number) => void;
}) {
  if (!goals.length) return null;
  return (
    <div
      className="save-goal-inbound-breakdown"
      role="group"
      aria-label="Daily inbound split"
    >
      {goals.map((g) => (
        <GoalPercentControls
          key={g.id}
          label={g.name}
          percent={inboundPercent(g)}
          busy={busy}
          onChange={(next) => onPercentChange(g.id, next)}
        />
      ))}
    </div>
  );
}

function LedgerAllocationLine({
  day,
  goals,
}: {
  day: Pick<SaveGoalDay, "allocations" | "leftover" | "lumpSum">;
  goals: SaveGoal[];
}) {
  const nameById = new Map(goals.map((g) => [g.id, g.name]));
  const parts = (day.allocations ?? [])
    .filter((a) => a.amount !== 0)
    .map((a) => `${nameById.get(a.goalId) ?? "Goal"} ${formatMoney(a.amount)}`);
  if (!parts.length) return null;
  return <p className="tiny save-goal-ledger-alloc">{parts.join(" · ")}</p>;
}

function DailyLedgerDay({
  label,
  inbound,
  adds,
  spend,
  leftover,
  lump,
  closed,
  goals,
  day,
  spendCategories,
  busy,
  onRemoveSpend,
}: {
  label: string;
  inbound: number;
  adds?: number;
  spend: number | null;
  leftover: number | null;
  lump?: number;
  closed: boolean;
  goals: SaveGoal[];
  day?: SaveGoalDay | null;
  /** Soft category names shown next to Spend (e.g. Meals) */
  spendCategories?: string[];
  busy?: boolean;
  /** Remove this day's spend (and undo apply) so it can be re-entered */
  onRemoveSpend?: () => void;
}) {
  const addTotal = adds ?? 0;
  const categoryLine =
    spendCategories && spendCategories.length > 0
      ? spendCategories.join(" · ")
      : null;
  const canRemoveSpend =
    Boolean(onRemoveSpend) && spend !== null && spend > 0;
  return (
    <div className={`save-goal-ledger-day${closed ? "" : " open"}`}>
      <div className="save-goal-ledger-day-head">
        <span className="save-goal-ledger-date">{label}</span>
        {closed && label === "Today" ? (
          <span className="tiny save-goal-applied-badge">Applied</span>
        ) : !closed ? (
          <span className="tiny muted">open</span>
        ) : null}
      </div>
      <div className="save-goal-ledger-rows">
        <div className="save-goal-ledger-row">
          <span>Inbound</span>
          <span>{formatMoney(inbound)}</span>
        </div>
        {addTotal > 0 ? (
          <div className="save-goal-ledger-row">
            <span>Adds</span>
            <span>+{formatMoney(addTotal)}</span>
          </div>
        ) : null}
        <div className="save-goal-ledger-row">
          <span className="save-goal-ledger-spend-label">
            Spend
            {categoryLine && spend !== null && spend > 0 ? (
              <span className="save-goal-ledger-spend-cat">{categoryLine}</span>
            ) : null}
          </span>
          <span className="save-goal-ledger-spend-val">
            {spend === null
              ? "—"
              : spend > 0
                ? `−${formatMoney(spend)}`
                : formatMoney(0)}
            {canRemoveSpend ? (
              <button
                type="button"
                className="save-goal-ledger-remove"
                disabled={busy}
                onClick={onRemoveSpend}
              >
                Remove
              </button>
            ) : null}
          </span>
        </div>
        {lump && lump > 0 ? (
          <div className="save-goal-ledger-row">
            <span>Lump</span>
            <span>+{formatMoney(lump)}</span>
          </div>
        ) : null}
        <div className="save-goal-ledger-row leftover">
          <span>Left</span>
          <span>{leftover === null ? "—" : formatMoney(leftover)}</span>
        </div>
      </div>
      {day ? <LedgerAllocationLine day={day} goals={goals} /> : null}
    </div>
  );
}

function MonthAppliedLine({
  summary,
  goals,
}: {
  summary: SaveGoalMonthSummary;
  goals: SaveGoal[];
}) {
  const nameById = new Map(goals.map((g) => [g.id, g.name]));
  const parts = Object.entries(summary.appliedByGoalId)
    .filter(([, amount]) => amount !== 0)
    .map(
      ([goalId, amount]) =>
        `${nameById.get(goalId) ?? "Goal"} ${formatMoney(amount)}`,
    );
  if (!parts.length) {
    return <p className="tiny muted save-goal-month-line">Applied —</p>;
  }
  return (
    <p className="tiny save-goal-month-line">
      <span className="save-goal-month-kicker">Applied</span> {parts.join(" · ")}
    </p>
  );
}

function MonthSpendLine({ summary }: { summary: SaveGoalMonthSummary }) {
  const parts = SAVE_GOAL_SPEND_CATEGORIES.map((c) => {
    const amount = summary.spendByCategory[c.id] ?? 0;
    if (amount <= 0) return null;
    return `${c.label} ${formatMoney(amount)}`;
  }).filter(Boolean) as string[];
  if (!parts.length) {
    return <p className="tiny muted save-goal-month-line">Spend $0</p>;
  }
  return (
    <p className="tiny save-goal-month-line">
      <span className="save-goal-month-kicker">Spend</span> {parts.join(" · ")}
    </p>
  );
}

function PriorMonthBlock({
  monthKey,
  isCurrentMonth,
  summary,
  goals,
  busy,
  onClearDaySpend,
}: {
  monthKey: string;
  isCurrentMonth: boolean;
  summary: SaveGoalMonthSummary;
  goals: SaveGoal[];
  busy?: boolean;
  onClearDaySpend?: (date: string) => void;
}) {
  const { state } = useApp();
  const [open, setOpen] = useState(isCurrentMonth);
  const label = formatCalendarMonthLabel(monthKey);
  const dayCount = summary.days.length;

  function renderDays() {
    return summary.days.map((d) => (
      <DailyLedgerDay
        key={d.date}
        label={formatTargetDateLabel(d.date)}
        inbound={d.dailyIncome}
        spend={d.spendTotal}
        leftover={d.leftover}
        lump={d.lumpSum}
        closed
        goals={goals}
        day={d}
        spendCategories={spendCategoryLabelsForDate(state, d.date)}
        busy={busy}
        onRemoveSpend={
          onClearDaySpend && d.spendTotal > 0
            ? () => onClearDaySpend(d.date)
            : undefined
        }
      />
    ));
  }

  // In-progress month: daily cards only (always expanded).
  if (isCurrentMonth) {
    return <div className="save-goal-ledger-month current">{renderDays()}</div>;
  }

  return (
    <div className="save-goal-ledger-month">
      <button
        type="button"
        className="save-goal-month-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span className="save-goal-month-title">{label}</span>
        <span className="tiny muted">{dayCount} day{dayCount === 1 ? "" : "s"}</span>
      </button>
      {!open ? (
        <div className="save-goal-month-summary">
          <MonthAppliedLine summary={summary} goals={goals} />
          <MonthSpendLine summary={summary} />
        </div>
      ) : (
        <div className="save-goal-ledger-history-list">{renderDays()}</div>
      )}
    </div>
  );
}

/** Daily inbound − spend = leftover ledger (today + recent closes). */
function DailyLedger({
  today,
  goals,
  busy,
  onApply,
  onUndoApply,
  onClearDaySpend,
}: {
  today: string;
  goals: SaveGoal[];
  busy?: boolean;
  onApply?: (opts?: {
    drawFromGoalId?: string;
    scope?: "all" | "rolled";
    leftoverMode?: "preset" | "custom";
    leftoverGoalId?: string;
    leftoverAllocations?: Array<{ goalId: string; amount: number }>;
  }) => void;
  onUndoApply?: () => void;
  onClearDaySpend?: (date: string) => void;
}) {
  const { state } = useApp();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drawFromGoalId, setDrawFromGoalId] = useState("");
  const [rollPrompt, setRollPrompt] = useState(false);
  const [rollScope, setRollScope] = useState<"all" | "rolled">("all");
  const [rollAutoShown, setRollAutoShown] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {},
  );
  const todayClose = useMemo(
    () => (today ? saveGoalCloseForDate(state, today) : null),
    [state, today],
  );
  const running = useMemo(
    () => leftoverBeforeApply(state, today),
    [state, today],
  );
  const monthGroups = useMemo(
    () => groupSaveGoalClosesByMonth(state, today),
    [state, today],
  );
  const historyCount = monthGroups.reduce(
    (n, g) => n + g.summary.days.length,
    0,
  );

  const spendShown = todayClose ? todayClose.spendTotal : running.spend;
  const leftShown = todayClose ? todayClose.leftover : running.left;
  const applied = Boolean(todayClose);
  const hasRolled = running.carryIn !== 0 && !applied;
  const needsDrawPick =
    goals.length > 1 &&
    (leftShown < 0 ||
      (hasRolled && running.carryIn < 0) ||
      (rollPrompt && rollScope === "rolled" && running.carryIn < 0));
  const canApply =
    !needsDrawPick || Boolean(drawFromGoalId) || goals.length === 1;

  // Opening /save-goals with rolled leftover: ask apply-all vs rolled-only.
  useEffect(() => {
    if (!onApply || rollAutoShown || !hasRolled) return;
    setRollScope("all");
    setRollPrompt(true);
    setRollAutoShown(true);
  }, [onApply, hasRolled, rollAutoShown]);

  function applyOpts(
    scope: "all" | "rolled" = "all",
    extra?: {
      leftoverMode?: "preset" | "custom";
      leftoverGoalId?: string;
      leftoverAllocations?: Array<{ goalId: string; amount: number }>;
    },
  ) {
    const needsDraw =
      (scope === "all" && leftShown < 0) ||
      (scope === "rolled" && running.carryIn < 0);
    const base = needsDraw
      ? {
          scope,
          drawFromGoalId:
            drawFromGoalId ||
            (goals.length === 1 ? goals[0].id : undefined),
        }
      : { scope };
    return { ...base, ...extra };
  }

  const customParsed = goals.map((g) => {
    const raw = customAmounts[g.id] ?? "";
    const n = Number(raw);
    return {
      goalId: g.id,
      amount: Number.isFinite(n) && n >= 0 ? round2(n) : NaN,
    };
  });
  const customSum = round2(
    customParsed.reduce(
      (s, a) => s + (Number.isFinite(a.amount) ? a.amount : 0),
      0,
    ),
  );
  const customValid =
    customParsed.every((a) => Number.isFinite(a.amount)) &&
    customSum === round2(leftShown);

  function requestApply() {
    if (!onApply) return;
    setCustomOpen(false);
    if (hasRolled) {
      setRollScope("all");
      setRollPrompt(true);
      return;
    }
    onApply(applyOpts("all"));
  }

  function requestCustom() {
    if (!onApply) return;
    setRollPrompt(false);
    const seeded = splitPoolByWeight(leftShown, goals);
    const next: Record<string, string> = {};
    for (const g of goals) {
      const row = seeded.find((a) => a.goalId === g.id);
      next[g.id] = String(row?.amount ?? 0);
    }
    setCustomAmounts(next);
    setCustomOpen(true);
  }

  function confirmCustomApply() {
    if (!onApply || !customValid) return;
    onApply(
      applyOpts("all", {
        leftoverMode: "custom",
        leftoverAllocations: customParsed.map((a) => ({
          goalId: a.goalId,
          amount: a.amount,
        })),
      }),
    );
    setCustomOpen(false);
  }

  function confirmRollApply() {
    if (!onApply) return;
    onApply(applyOpts(rollScope));
    setRollPrompt(false);
  }

  return (
    <div className="save-goal-ledger" aria-label="Daily ledger">
      <p className="eyebrow save-goal-ledger-title">Daily</p>
      <DailyLedgerDay
        label="Today"
        inbound={running.inbound}
        adds={running.adds}
        spend={spendShown}
        leftover={leftShown}
        lump={todayClose?.lumpSum}
        closed={applied}
        goals={goals}
        day={todayClose}
        spendCategories={spendCategoryLabelsForDate(state, today)}
      />
      {needsDrawPick ? (
        <div className="save-goal-draw-from">
          <p className="field-label" style={{ marginBottom: 6 }}>
            Take from
          </p>
          <div className="chip-row">
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`chip${drawFromGoalId === g.id ? " selected" : ""}`}
                onClick={() => setDrawFromGoalId(g.id)}
                disabled={busy}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {rollPrompt && onApply ? (
        <div className="save-goal-roll-prompt" role="group" aria-label="Apply rolled amount">
          <p className="tiny" style={{ margin: "0 0 10px" }}>
            <strong>{formatMoney(leftShown)} left</strong> includes{" "}
            <strong>{formatMoney(Math.abs(running.carryIn))}</strong> that
            rolled in.
          </p>
          <div className="save-goal-roll-options">
            <button
              type="button"
              className={`save-goal-roll-option${rollScope === "all" ? " selected" : ""}`}
              onClick={() => setRollScope("all")}
              disabled={busy}
            >
              <span className="save-goal-roll-option-label">
                Apply all {formatMoney(Math.abs(leftShown))}
              </span>
              <span className="tiny muted">
                {leftShown < 0
                  ? "Takes the full left from your goals — rolled + today."
                  : "Puts the full left into your goals — rolled + today."}
              </span>
            </button>
            <button
              type="button"
              className={`save-goal-roll-option${rollScope === "rolled" ? " selected" : ""}`}
              onClick={() => setRollScope("rolled")}
              disabled={busy}
            >
              <span className="save-goal-roll-option-label">
                Apply only the {formatMoney(Math.abs(running.carryIn))} rolled
              </span>
              <span className="tiny muted">
                {running.carryIn < 0
                  ? "Goals take the rolled amount; today’s leftover keeps rolling."
                  : "Goals get the rolled amount; today’s leftover keeps rolling."}
              </span>
            </button>
          </div>
          <div className="save-goal-create-actions" style={{ marginTop: 12 }}>
            <PrimaryButton
              onClick={confirmRollApply}
              disabled={busy || !canApply}
            >
              {busy ? "Saving…" : "Confirm"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setRollPrompt(false)}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}
      {customOpen && onApply && !rollPrompt ? (
        <div
          className="save-goal-custom-apply"
          role="group"
          aria-label="Custom apply"
        >
          <p className="field-label" style={{ marginBottom: 6 }}>
            Apply {formatMoney(leftShown)} today
          </p>
          <p className="tiny muted" style={{ margin: "0 0 10px" }}>
            One-off dollars for today — does not change your{" "}
            {goals.map((g) => `${inboundPercent(g)}%`).join(" / ")} daily
            chips.
          </p>
          <div className="save-goal-custom-amounts">
            {goals.map((g) => (
              <label key={g.id} className="field save-goal-custom-amount-row">
                <span className="field-label">{g.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={customAmounts[g.id] ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    setCustomAmounts((prev) => ({
                      ...prev,
                      [g.id]: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </label>
            ))}
          </div>
          <p
            className="tiny"
            style={{
              margin: "8px 0 0",
              color: customValid ? "var(--muted)" : "var(--danger)",
            }}
          >
            {customValid
              ? `Adds up to ${formatMoney(leftShown)}`
              : `Must add up to ${formatMoney(leftShown)} (now ${formatMoney(customSum)})`}
          </p>
          <div className="save-goal-create-actions" style={{ marginTop: 12 }}>
            <PrimaryButton
              onClick={confirmCustomApply}
              disabled={busy || !customValid || !canApply}
            >
              {busy ? "Saving…" : "Apply"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setCustomOpen(false)}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}
      {!rollPrompt && !customOpen && (onApply || (applied && onUndoApply)) ? (
        <div className="save-goal-ledger-apply">
          {onApply ? (
            <>
              <PrimaryButton
                onClick={requestApply}
                disabled={busy || !canApply}
              >
                {busy
                  ? "Saving…"
                  : applied
                    ? "Re-apply total"
                    : "Apply total"}
              </PrimaryButton>
              <SecondaryButton
                onClick={requestCustom}
                disabled={busy || !canApply || leftShown <= 0}
              >
                Custom
              </SecondaryButton>
            </>
          ) : null}
          {applied && onUndoApply ? (
            <SecondaryButton onClick={onUndoApply} disabled={busy}>
              Undo apply
            </SecondaryButton>
          ) : null}
        </div>
      ) : null}
      {historyCount > 0 ? (
        <div className="save-goal-ledger-history">
          <button
            type="button"
            className="save-goal-log-toggle"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <span aria-hidden="true">{historyOpen ? "▾" : "▸"}</span>
            Prior days ({historyCount})
          </button>
          {historyOpen ? (
            <div className="save-goal-ledger-history-list">
              {monthGroups.map((g) => (
                <PriorMonthBlock
                  key={g.monthKey}
                  monthKey={g.monthKey}
                  isCurrentMonth={g.isCurrentMonth}
                  summary={g.summary}
                  goals={goals}
                  busy={busy}
                  onClearDaySpend={onClearDaySpend}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GoalAdjustmentLog({
  goalId,
  busy,
  onRemove,
}: {
  goalId: string;
  busy: boolean;
  onRemove: (id: string) => void;
}) {
  const { state } = useApp();
  const rows = useMemo(
    () => listSaveGoalAdjustmentsForGoal(state, goalId),
    [state, goalId],
  );
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;

  return (
    <div className="save-goal-goal-log">
      <button
        type="button"
        className="save-goal-log-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        Adjustments ({rows.length})
      </button>
      {open ? (
        <div className="save-goal-adjust-list" aria-label="Adjustment log">
          {rows.map((d) => (
            <div key={d.id} className="save-goal-adjust-row">
              <div className="save-goal-adjust-meta">
                <span className="tiny">
                  {d.date} · {formatMoney(d.goalAmount)}
                </span>
              </div>
              {d.note ? (
                <span className="tiny save-goal-adjust-reason" title={d.note}>
                  {d.note}
                </span>
              ) : (
                <span className="save-goal-adjust-reason" aria-hidden="true" />
              )}
              <button
                type="button"
                className="save-goal-add-link"
                disabled={busy || !d.id}
                onClick={() => d.id && onRemove(d.id)}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GoalProgressRow({
  goal,
  today,
  onEdit,
  onRemoveAdjust,
  busy,
}: {
  goal: SaveGoal;
  today: string;
  onEdit: (goal: SaveGoal) => void;
  onRemoveAdjust: (id: string) => void;
  busy: boolean;
}) {
  const { state } = useApp();
  const toGo = amountToGo(goal);
  const ratio = progressRatio(goal);
  const pct = inboundPercent(goal);
  const projection = projectSaveGoalTargetDate(state, goal, today);
  const under = goal.savedAmount < 0;

  let dateLine: string;
  if (projection.status === "reached") {
    dateLine = "Reached";
  } else if (pct <= 0) {
    dateLine = "0% daily";
  } else if (projection.targetDate) {
    dateLine = formatTargetDateLabel(projection.targetDate);
  } else {
    dateLine = "Needs leftover";
  }

  return (
    <article className="save-goal-row" aria-label={goal.name}>
      <div className="save-goal-row-head">
        <h3 className="save-goal-name">{goal.name}</h3>
        <p className="save-goal-togo">
          {formatMoney(toGo)} <span className="save-goal-togo-label">to go</span>
        </p>
      </div>
      <div
        className="save-goal-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label={`${Math.round(ratio * 100)}% saved`}
      >
        <span
          className="save-goal-bar-fill"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <div className="save-goal-meta">
        <span className="tiny">
          {formatMoney(Math.max(0, goal.savedAmount))} of{" "}
          {formatMoney(goal.targetAmount)}
          {under ? (
            <span className="save-goal-under">
              {" "}
              · {formatMoney(Math.abs(goal.savedAmount))} under
            </span>
          ) : null}
        </span>
        <span className="tiny save-goal-eta">{dateLine}</span>
      </div>
      <div className="save-goal-inbound-row">
        <button
          type="button"
          className="save-goal-add-link"
          disabled={busy}
          onClick={() => onEdit(goal)}
        >
          Edit
        </button>
      </div>
      <GoalAdjustmentLog
        goalId={goal.id}
        busy={busy}
        onRemove={onRemoveAdjust}
      />
    </article>
  );
}

function AdjustmentsList({
  adjustments,
  goals,
  busy,
  onRemove,
}: {
  adjustments: SaveGoalDay[];
  goals: SaveGoal[];
  busy: boolean;
  onRemove: (id: string) => void;
}) {
  if (!adjustments.length) return null;
  const nameById = new Map(goals.map((g) => [g.id, g.name]));
  return (
    <div className="save-goal-adjust-list" aria-label="Recent adjustments">
      {adjustments.slice(0, 8).map((d) => {
        const total = (d.allocations ?? []).reduce((s, a) => s + a.amount, 0);
        const parts = (d.allocations ?? [])
          .filter((a) => a.amount !== 0)
          .map((a) => {
            const label = nameById.get(a.goalId) ?? "Goal";
            return `${label} ${formatMoney(a.amount)}`;
          });
        return (
          <div key={d.id} className="save-goal-adjust-row">
            <div className="save-goal-adjust-meta">
              <span className="tiny">
                {d.date} · {formatMoney(total)}
              </span>
              {parts.length ? (
                <span className="tiny muted">{parts.join(" · ")}</span>
              ) : null}
            </div>
            {d.note ? (
              <span className="tiny save-goal-adjust-reason" title={d.note}>
                {d.note}
              </span>
            ) : (
              <span className="save-goal-adjust-reason" aria-hidden="true" />
            )}
            <button
              type="button"
              className="save-goal-add-link"
              disabled={busy || !d.id}
              onClick={() => d.id && onRemove(d.id)}
            >
              Undo
            </button>
          </div>
        );
      })}
    </div>
  );
}

const ADJUST_REASON_INBOUND = "inbound";
const ADJUST_REASON_PRESETS = [
  { id: ADJUST_REASON_INBOUND, label: "Inbound" },
  { id: "bonus", label: "Bonus" },
  { id: "gift", label: "Gift" },
  { id: "transfer", label: "Transfer" },
  { id: "other", label: "Other" },
] as const;

function AdjustPanel({
  goals,
  today,
  busy,
  error,
  onCancel,
  onSubmit,
  onSetInbound,
}: {
  goals: SaveGoal[];
  today: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (input: {
    date: string;
    amount: number;
    mode: "preset" | "custom";
    goalId?: string;
    note?: string;
  }) => void;
  onSetInbound: (input: { date: string; amount: number }) => void;
}) {
  const [adjustDate, setAdjustDate] = useState(
    () => today || SAVE_GOAL_LEDGER_START,
  );
  const [adjustAmount, setAdjustAmount] = useState("");
  const [reasonPreset, setReasonPreset] = useState<string>("other");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSign, setAdjustSign] = useState<"add" | "subtract">("add");
  const [adjustMode, setAdjustMode] = useState<"preset" | "custom">("preset");
  const [customGoalId, setCustomGoalId] = useState(goals[0]?.id ?? "");

  const isInbound = reasonPreset === ADJUST_REASON_INBOUND;
  const minDate = SAVE_GOAL_LEDGER_START;
  const maxDate = today || undefined;

  useEffect(() => {
    if (today && (!adjustDate || adjustDate > today)) {
      setAdjustDate(today);
    }
  }, [today, adjustDate]);

  function reasonNote(): string | undefined {
    if (isInbound) return "Inbound";
    if (reasonPreset === "other" || !reasonPreset) {
      return adjustReason.trim() || undefined;
    }
    const label =
      ADJUST_REASON_PRESETS.find((p) => p.id === reasonPreset)?.label ??
      reasonPreset;
    const extra = adjustReason.trim();
    return extra ? `${label}: ${extra}` : label;
  }

  return (
    <div className="save-goal-create">
      <p className="eyebrow">Adjust for the day</p>
      {!isInbound ? (
        <div className="chip-row">
          <button
            type="button"
            className={`chip${adjustSign === "add" ? " selected" : ""}`}
            onClick={() => setAdjustSign("add")}
          >
            Add
          </button>
          <button
            type="button"
            className={`chip${adjustSign === "subtract" ? " selected" : ""}`}
            onClick={() => setAdjustSign("subtract")}
          >
            Subtract
          </button>
        </div>
      ) : null}
      <label className="field">
        <span className="field-label">Date</span>
        <input
          type="date"
          value={adjustDate}
          min={minDate}
          max={maxDate}
          onChange={(e) => setAdjustDate(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">
          {isInbound ? "Inbound for day" : "Amount"}
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={isInbound ? "0.01" : "1"}
          value={adjustAmount}
          onChange={(e) => setAdjustAmount(e.target.value)}
          placeholder={isInbound ? "16" : "50"}
        />
      </label>
      <div className="save-goal-adjust-reason-fields">
        <p className="field-label" style={{ marginBottom: 6 }}>
          Reason
        </p>
        <div className="chip-row">
          {ADJUST_REASON_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip${reasonPreset === p.id ? " selected" : ""}`}
              onClick={() => {
                setReasonPreset(p.id);
                if (p.id === ADJUST_REASON_INBOUND) {
                  setAdjustReason("");
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {!isInbound ? (
          <label className="field" style={{ marginTop: 8 }}>
            <span className="field-label">
              {reasonPreset === "other" ? "What for?" : "Details (optional)"}
            </span>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder={
                reasonPreset === "other"
                  ? "Why this adjustment?"
                  : "Optional note…"
              }
              maxLength={80}
              autoComplete="off"
            />
          </label>
        ) : (
          <p className="tiny muted" style={{ margin: "8px 0 0" }}>
            Overwrites the default daily inbound for this date.
          </p>
        )}
      </div>
      {!isInbound ? (
        <>
          <p className="field-label" style={{ marginBottom: 6 }}>
            Apply with
          </p>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${adjustMode === "preset" ? " selected" : ""}`}
              onClick={() => setAdjustMode("preset")}
            >
              Daily chips
            </button>
            <button
              type="button"
              className={`chip${adjustMode === "custom" ? " selected" : ""}`}
              onClick={() => {
                setAdjustMode("custom");
                if (!customGoalId && goals[0]) setCustomGoalId(goals[0].id);
              }}
            >
              Custom (one area)
            </button>
          </div>
          {adjustMode === "custom" ? (
            <div className="chip-row" style={{ marginTop: 8 }}>
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`chip${customGoalId === g.id ? " selected" : ""}`}
                  onClick={() => setCustomGoalId(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="save-goal-create-actions">
        <PrimaryButton
          disabled={busy || !adjustDate || !reasonPreset}
          onClick={() => {
            if (!adjustDate) return;
            const raw = Number(adjustAmount);
            if (!Number.isFinite(raw) || raw < 0) return;
            if (isInbound) {
              onSetInbound({ date: adjustDate, amount: raw });
              return;
            }
            if (raw <= 0) return;
            onSubmit({
              date: adjustDate,
              amount: adjustSign === "add" ? raw : -raw,
              mode: adjustMode,
              goalId: adjustMode === "custom" ? customGoalId : undefined,
              note: reasonNote(),
            });
          }}
        >
          {busy
            ? "Saving…"
            : isInbound
              ? "Set inbound"
              : adjustSign === "add"
                ? "Add"
                : "Subtract"}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

/** Home saver — day total + add/subtract + collapsed ledger. Apply on /save-goals + evening. */
function HomeSaveGoalsGlance() {
  const { state, today, post } = useApp();
  const [subtractOpen, setSubtractOpen] = useState(false);
  const [entryAmount, setEntryAmount] = useState("");
  const [spendCategory, setSpendCategory] =
    useState<SaveGoalSpendCategory | "">("");
  const [otherNote, setOtherNote] = useState("");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const day = useMemo(() => {
    if (!today) {
      return {
        base: 0,
        carryIn: 0,
        inbound: 0,
        adds: 0,
        spend: 0,
        left: 0,
      };
    }
    return leftoverBeforeApply(state, today);
  }, [state, today]);
  const entries = useMemo(
    () => (today ? listSaveGoalSpendEntries(state, today) : []),
    [state, today],
  );
  const todayClose = useMemo(
    () => (today ? saveGoalCloseForDate(state, today) : null),
    [state, today],
  );
  const applied = Boolean(todayClose);

  async function submitSubtract() {
    const amount = Number(entryAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!spendCategory) {
      setError("Pick a category.");
      return;
    }
    const note =
      spendCategory === "other" ? otherNote.trim().slice(0, 80) : undefined;
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "addSpend",
        date: today,
        amount,
        kind: "spend",
        category: spendCategory,
        ...(note ? { note } : {}),
      });
      setEntryAmount("");
      setSpendCategory("");
      setOtherNote("");
      setSubtractOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not subtract");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", { action: "removeSpend", id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  const ledgerCount = entries.length + (applied ? 1 : 0);
  const dayTotalShown = day.inbound + day.adds;

  return (
    <section
      className="home-card home-card-save-goals home-card-save-goals-glance"
      aria-label="Save goals"
    >
      <div className="home-card-head save-goal-glance-head">
        <div>
          <p className="home-card-kicker save-goal-glance-kicker">Save goals</p>
          <p className="tiny muted save-goal-day-total-label">
            Day total {formatMoneyDown(dayTotalShown)}
            {day.carryIn !== 0 ? (
              <>
                {" "}
                · {day.carryIn > 0 ? "+" : ""}
                {formatMoneyDown(day.carryIn)} rolled
              </>
            ) : null}
          </p>
        </div>
        <p className="save-goal-inbound-figure" aria-label="Left today">
          {formatMoneyDown(day.left)}
        </p>
      </div>

      {goals.length === 0 ? (
        <p className="tiny muted" style={{ margin: 0 }}>
          Set up a goal on the save goals page first.
        </p>
      ) : (
        <>
          {subtractOpen ? (
            <div className="save-goal-create">
              <label className="field">
                <span className="field-label">Subtract</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="8.18"
                  autoFocus
                />
              </label>
              <div className="save-goal-spend-category">
                <p className="field-label" style={{ marginBottom: 6 }}>
                  Category
                </p>
                <div className="chip-row">
                  {SAVE_GOAL_SPEND_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`chip${spendCategory === c.id ? " selected" : ""}`}
                      onClick={() => {
                        setSpendCategory(c.id);
                        if (c.id !== "other") setOtherNote("");
                      }}
                      disabled={busy}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {spendCategory === "other" ? (
                  <label className="field save-goal-other-note">
                    <span className="field-label">What was it?</span>
                    <input
                      type="text"
                      value={otherNote}
                      onChange={(e) => setOtherNote(e.target.value)}
                      placeholder="e.g. parking, gift wrap"
                      maxLength={80}
                      disabled={busy}
                      autoComplete="off"
                    />
                  </label>
                ) : null}
              </div>
              {error ? (
                <p className="tiny" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              ) : null}
              <div className="save-goal-create-actions">
                <PrimaryButton
                  onClick={() => void submitSubtract()}
                  disabled={busy || !spendCategory}
                >
                  {busy ? "Saving…" : "Subtract"}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setSubtractOpen(false);
                    setSpendCategory("");
                    setOtherNote("");
                    setError("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="save-goal-glance-actions">
              <PrimaryButton
                onClick={() => {
                  setError("");
                  setEntryAmount("");
                  setSpendCategory("");
                  setOtherNote("");
                  setSubtractOpen(true);
                }}
                disabled={busy}
              >
                Subtract
              </PrimaryButton>
            </div>
          )}

          {error && !subtractOpen ? (
            <p className="tiny" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          ) : null}

          {applied ? (
            <p className="tiny save-goal-applied-line">
              <span className="save-goal-applied-badge">Applied</span>
            </p>
          ) : null}

          {ledgerCount > 0 ? (
            <div className="save-goal-home-ledger">
              <button
                type="button"
                className="save-goal-log-toggle"
                aria-expanded={ledgerOpen}
                onClick={() => setLedgerOpen((v) => !v)}
              >
                <span aria-hidden="true">{ledgerOpen ? "▾" : "▸"}</span>
                Ledger ({ledgerCount})
              </button>
              {ledgerOpen ? (
                <div className="save-goal-ledger-rows home-ledger-body">
                  <div className="save-goal-ledger-row">
                    <span>Inbound</span>
                    <span>{formatMoney(day.inbound)}</span>
                  </div>
                  {entries.map((e) => {
                    const isAdd = e.kind === "add";
                    return (
                      <div key={e.id} className="save-goal-ledger-row spend">
                        <span>
                          {isAdd
                            ? "Add"
                            : saveGoalSpendEntryLabel(e)}
                        </span>
                        <span className="save-goal-ledger-spend-val">
                          {isAdd ? "+" : "−"}
                          {formatMoney(e.amount)}
                          <button
                            type="button"
                            className="save-goal-add-link"
                            disabled={busy}
                            onClick={() => void removeEntry(e.id)}
                          >
                            Undo
                          </button>
                        </span>
                      </div>
                    );
                  })}
                  <div className="save-goal-ledger-row leftover">
                    <span>Left</span>
                    <span>{formatMoney(day.left)}</span>
                  </div>
                  {applied && todayClose ? (
                    <p className="tiny muted save-goal-ledger-alloc">
                      {(todayClose.allocations ?? [])
                        .filter((a) => a.amount !== 0)
                        .map((a) => {
                          const g = goals.find((x) => x.id === a.goalId);
                          return `${g?.name ?? "Goal"} ${formatMoney(a.amount)}`;
                        })
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <Link href="/save-goals" className="btn ghost workout-open-link">
        Open save goals →
      </Link>
    </section>
  );
}

/** Full save-goals surface (progress, chips, create) — not shown on Home. */
function SaveGoalsDetail() {
  const { state, today, post } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [claimDaily, setClaimDaily] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editing, setEditing] = useState<SaveGoal | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSaved, setEditSaved] = useState("");
  const [deleting, setDeleting] = useState<SaveGoal | null>(null);
  const [reallocateTo, setReallocateTo] = useState<string>("");
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [editMonthly, setEditMonthly] = useState("");

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const rate = today ? dailyIncomeRate(today, settings.monthlyIncome) : 0;
  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const draftMonthly = Number(editMonthly);
  const draftRate =
    today && Number.isFinite(draftMonthly) && draftMonthly >= 0
      ? dailyIncomeRate(today, floorDollar(draftMonthly))
      : rate;

  async function create() {
    const targetAmount = Number(target);
    if (!name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Name and a target over $0 are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "create",
        name: name.trim(),
        targetAmount,
        claimDailyInbound: claimDaily || goals.length === 0,
      });
      setName("");
      setTarget("");
      setClaimDaily(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create goal");
    } finally {
      setBusy(false);
    }
  }

  async function setPercent(goalId: string, percent: number) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "setInbound",
        goalId,
        percent,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update percent");
    } finally {
      setBusy(false);
    }
  }

  async function saveMonthlyIncome() {
    const monthlyIncome = Number(editMonthly);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
      setError("Enter a monthly amount of $0 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "settings",
        monthlyIncome,
      });
      setIncomeOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update daily amount");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjust(input: {
    date: string;
    amount: number;
    mode: "preset" | "custom";
    goalId?: string;
    note?: string;
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      setError("Pick a date for the adjustment.");
      return;
    }
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "adjust",
        date: input.date,
        amount: input.amount,
        mode: input.mode,
        goalId: input.goalId,
        note: input.note,
      });
      setAdjustOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply adjustment");
    } finally {
      setBusy(false);
    }
  }

  async function submitSetInbound(input: { date: string; amount: number }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      setError("Pick a date for inbound.");
      return;
    }
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      setError("Enter an inbound of $0 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "setInbound",
        date: input.date,
        amount: input.amount,
      });
      setAdjustOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set inbound");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const targetAmount = Number(editTarget);
    const savedAmount = Number(editSaved);
    if (!editName.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Name and a target over $0 are required.");
      return;
    }
    if (!Number.isFinite(savedAmount)) {
      setError("Enter a saved total (whole dollars).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "update",
        id: editing.id,
        name: editName.trim(),
        targetAmount,
        savedAmount,
        date: today,
      });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "delete",
        id: deleting.id,
        date: today,
        reallocateToGoalId: reallocateTo || null,
      });
      setDeleting(null);
      setEditing(null);
      setReallocateTo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function removeAdjust(id: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", { action: "removeAdjust", id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not undo");
    } finally {
      setBusy(false);
    }
  }

  async function applyTotals(opts?: {
    drawFromGoalId?: string;
    scope?: "all" | "rolled";
    leftoverMode?: "preset" | "custom";
    leftoverGoalId?: string;
    leftoverAllocations?: Array<{ goalId: string; amount: number }>;
  }) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "applyTotals",
        date: today,
        scope: opts?.scope === "rolled" ? "rolled" : "all",
        drawFromGoalId: opts?.drawFromGoalId,
        leftoverMode: opts?.leftoverMode,
        leftoverGoalId: opts?.leftoverGoalId,
        leftoverAllocations: opts?.leftoverAllocations,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply");
    } finally {
      setBusy(false);
    }
  }

  async function undoApply() {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "undoApply",
        date: today,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not undo apply");
    } finally {
      setBusy(false);
    }
  }

  async function clearDaySpend(date: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "clearDaySpend",
        date,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove spend");
    } finally {
      setBusy(false);
    }
  }

  if (goals.length === 0 && !open) {
    return (
      <section
        className="home-card home-card-save-goals"
        aria-label="Save towards something"
      >
        <div className="home-card-head">
          <p className="home-card-kicker">Save goals</p>
          <h2>Save towards something</h2>
        </div>
        <button
          type="button"
          className="tiny save-goal-rate save-goal-inbound-edit"
          aria-label="Edit daily inbound"
          onClick={() => {
            setIncomeOpen(true);
            setEditMonthly(String(settings.monthlyIncome));
            setError("");
          }}
        >
          {formatMoneyDown(rate)} / day · tap to edit
        </button>
        {incomeOpen ? (
          <div className="save-goal-create save-goal-income-edit">
            <p className="eyebrow">Daily inbound</p>
            <label className="field">
              <span className="field-label">Monthly amount</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={editMonthly}
                onChange={(e) => setEditMonthly(e.target.value)}
                autoFocus
              />
            </label>
            <p className="tiny save-goal-rate">
              → {formatMoneyDown(draftRate)} / day this month
            </p>
            <div className="save-goal-create-actions">
              <PrimaryButton
                disabled={busy}
                onClick={() => void saveMonthlyIncome()}
              >
                {busy ? "Saving…" : "Save"}
              </PrimaryButton>
              <SecondaryButton
                disabled={busy}
                onClick={() => setIncomeOpen(false)}
              >
                Cancel
              </SecondaryButton>
            </div>
          </div>
        ) : null}
        <PrimaryButton onClick={() => setOpen(true)}>
          Add a save goal
        </PrimaryButton>
      </section>
    );
  }

  const othersForDelete = deleting
    ? goals.filter((g) => g.id !== deleting.id)
    : [];

  return (
    <section
      className="home-card home-card-save-goals"
      aria-label="Save goals"
    >
      <div className="home-card-head">
        <div className="save-goal-detail-head">
          <div>
            <p className="home-card-kicker">Save goals</p>
            <h2>
              {goals.length === 0 ? "Save towards something" : "Saving toward"}
            </h2>
          </div>
          <button
            type="button"
            className="save-goal-inbound-figure save-goal-inbound-edit"
            aria-label="Edit daily inbound"
            aria-expanded={incomeOpen}
            onClick={() => {
              setIncomeOpen((v) => !v);
              setEditMonthly(String(settings.monthlyIncome));
              setError("");
            }}
          >
            {formatMoneyDown(rate)}
            <span className="tiny muted save-goal-inbound-edit-hint">/ day</span>
          </button>
        </div>
      </div>

      {incomeOpen ? (
        <div className="save-goal-create save-goal-income-edit">
          <p className="eyebrow">Daily inbound</p>
          <p className="tiny muted" style={{ marginTop: 0 }}>
            Set your monthly save budget — it becomes today&apos;s daily amount
            for the chips below.
          </p>
          <label className="field">
            <span className="field-label">Monthly amount</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={editMonthly}
              onChange={(e) => setEditMonthly(e.target.value)}
              autoFocus
            />
          </label>
          <p className="tiny save-goal-rate">
            → {formatMoneyDown(draftRate)} / day this month
          </p>
          {error ? (
            <p className="tiny" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="save-goal-create-actions">
            <PrimaryButton
              disabled={busy}
              onClick={() => void saveMonthlyIncome()}
            >
              {busy ? "Saving…" : "Save"}
            </PrimaryButton>
            <SecondaryButton
              disabled={busy}
              onClick={() => {
                setIncomeOpen(false);
                setError("");
              }}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      {goals.length > 0 ? (
        <InboundBreakdown
          goals={goals}
          busy={busy}
          onPercentChange={(id, percent) => void setPercent(id, percent)}
        />
      ) : null}

      {goals.length > 0 && today ? (
        <DailyLedger
          today={today}
          goals={goals}
          busy={busy}
          onApply={(opts) => void applyTotals(opts)}
          onUndoApply={() => void undoApply()}
          onClearDaySpend={(date) => void clearDaySpend(date)}
        />
      ) : null}

      {goals.map((g) => (
        <div key={g.id}>
          <GoalProgressRow
            goal={g}
            today={today}
            busy={busy}
            onRemoveAdjust={(id) => void removeAdjust(id)}
            onEdit={(goal) => {
              setEditing(goal);
              setEditName(goal.name);
              setEditTarget(String(goal.targetAmount));
              setEditSaved(String(floorDollar(goal.savedAmount)));
              setDeleting(null);
              setReallocateTo("");
              setError("");
            }}
          />
          {editing?.id === g.id && !deleting ? (
            <div className="save-goal-create" style={{ marginTop: 8 }}>
              <p className="eyebrow">Edit</p>
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Target</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step="1"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Saved toward goal</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={editSaved}
                  onChange={(e) => setEditSaved(e.target.value)}
                />
              </label>
              <div className="save-goal-create-actions">
                <PrimaryButton onClick={() => void saveEdit()} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setEditing(null);
                    setError("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </SecondaryButton>
              </div>
              <button
                type="button"
                className="save-goal-add-link"
                style={{ marginTop: 10 }}
                disabled={busy}
                onClick={() => {
                  setDeleting(g);
                  setReallocateTo("");
                  setError("");
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
          {deleting?.id === g.id ? (
            <div className="save-goal-create" style={{ marginTop: 8 }}>
              <p className="eyebrow">Delete {deleting.name}?</p>
              {deleting.savedAmount !== 0 && othersForDelete.length > 0 ? (
                <>
                  <p className="tiny" style={{ margin: 0 }}>
                    {formatMoney(deleting.savedAmount)} saved — move it?
                  </p>
                  <div className="chip-row">
                    <button
                      type="button"
                      className={`chip${reallocateTo === "" ? " selected" : ""}`}
                      onClick={() => setReallocateTo("")}
                    >
                      Don’t move
                    </button>
                    {othersForDelete.map((other) => (
                      <button
                        key={other.id}
                        type="button"
                        className={`chip${reallocateTo === other.id ? " selected" : ""}`}
                        onClick={() => setReallocateTo(other.id)}
                      >
                        → {other.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : deleting.savedAmount !== 0 ? (
                <p className="tiny" style={{ margin: 0 }}>
                  {formatMoney(deleting.savedAmount)} stays archived with this
                  goal.
                </p>
              ) : null}
              <div className="save-goal-create-actions">
                <PrimaryButton
                  onClick={() => void confirmDelete()}
                  disabled={busy}
                >
                  {busy ? "Deleting…" : "Delete"}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setDeleting(null);
                    setReallocateTo("");
                    setError("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </div>
      ))}

      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {adjustOpen ? (
        <AdjustPanel
          goals={goals}
          today={today ?? SAVE_GOAL_LEDGER_START}
          busy={busy}
          error={error}
          onCancel={() => setAdjustOpen(false)}
          onSubmit={(input) => void submitAdjust(input)}
          onSetInbound={(input) => void submitSetInbound(input)}
        />
      ) : null}

      {open ? (
        <div className="save-goal-create">
          <div className="chip-row">
            {NAME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`chip${name === preset ? " selected" : ""}`}
                onClick={() => setName(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hawaii, gift…"
              maxLength={80}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Target</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="500"
            />
          </label>
          {goals.length > 0 ? (
            <label className="check-row">
              <input
                type="checkbox"
                checked={claimDaily}
                onChange={(e) => setClaimDaily(e.target.checked)}
              />
              <span>100% daily inbound here</span>
            </label>
          ) : null}
          <div className="save-goal-create-actions">
            <PrimaryButton onClick={() => void create()} disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="save-goal-actions-row">
          <button
            type="button"
            className="save-goal-add-link"
            onClick={() => setOpen(true)}
          >
            + Add
          </button>
          {goals.length > 0 ? (
            <button
              type="button"
              className="save-goal-add-link"
              onClick={() => setAdjustOpen(true)}
            >
              Adjust
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function SaveGoalsCard({
  variant = "home",
}: {
  /** home = private glance (approve/adjust); page = full progress */
  variant?: "home" | "page";
} = {}) {
  if (variant === "page") return <SaveGoalsDetail />;
  return <HomeSaveGoalsGlance />;
}
