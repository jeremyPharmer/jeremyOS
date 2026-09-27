"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  HOME_SAVE_GOAL_CARD_LIMIT,
  activeSaveGoals,
  amountToGo,
  dailyIncomeRate,
  formatMoney,
  formatTargetDateLabel,
  inboundPercent,
  normalizeSaveGoalSettings,
  progressRatio,
  projectSaveGoalTargetDate,
} from "@/lib/save-goals";
import type { SaveGoal } from "@/lib/types";

const NAME_PRESETS = ["Trip", "Gift", "General saving"] as const;

function GoalProgressRow({
  goal,
  today,
  onClaimDaily,
  busy,
}: {
  goal: SaveGoal;
  today: string;
  onClaimDaily: (id: string) => void;
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
    dateLine = "0% of daily — tap chip to send inbound here";
  } else if (projection.status === "needs_leftover") {
    dateLine = "Add leftover to project a date";
  } else if (projection.targetDate) {
    dateLine = `On track for ${formatTargetDateLabel(projection.targetDate)}`;
  } else {
    dateLine = "Add leftover to project a date";
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
          className={`chip${pct >= 100 ? " selected" : ""}`}
          disabled={busy}
          onClick={() => onClaimDaily(goal.id)}
          title="Send 100% of daily inbound here"
        >
          {pct}% daily
        </button>
        {pct > 0 && pct < 100 ? (
          <span className="tiny muted">share of daily inbound</span>
        ) : null}
      </div>
    </article>
  );
}

export function SaveGoalsCard({
  variant = "home",
}: {
  /** home = glance card with open link; page = full list, no open link */
  variant?: "home" | "page";
} = {}) {
  const { state, today, post } = useApp();
  const isPage = variant === "page";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [claimDaily, setClaimDaily] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustSign, setAdjustSign] = useState<"add" | "subtract">("add");
  const [adjustMode, setAdjustMode] = useState<"preset" | "custom">("preset");
  const [customGoalId, setCustomGoalId] = useState<string>("");

  const [splitOpen, setSplitOpen] = useState(false);
  const [draftPercents, setDraftPercents] = useState<Record<string, string>>({});

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const rate = today ? dailyIncomeRate(today, settings.monthlyIncome) : 0;
  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const shown = isPage
    ? goals
    : goals.slice(0, HOME_SAVE_GOAL_CARD_LIMIT);

  /** Live preview while editing Split % — ETA follows draft inbound shares. */
  const splitPreviewState = useMemo(() => {
    if (!splitOpen) return state;
    return {
      ...state,
      saveGoals: (state.saveGoals ?? []).map((g) => {
        const raw = draftPercents[g.id];
        if (raw === undefined) return g;
        const n = Number(raw);
        return {
          ...g,
          allocationWeight: Number.isFinite(n) ? Math.max(0, n) : 0,
        };
      }),
    };
  }, [splitOpen, state, draftPercents]);

  const draftPercentSum = useMemo(() => {
    if (!splitOpen) return 100;
    return goals.reduce((s, g) => s + (Number(draftPercents[g.id]) || 0), 0);
  }, [splitOpen, goals, draftPercents]);

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

  async function claimDailyInbound(goalId: string) {
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "setInbound",
        soleGoalId: goalId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update inbound");
    } finally {
      setBusy(false);
    }
  }

  function openSplitEditor() {
    const draft: Record<string, string> = {};
    for (const g of goals) {
      draft[g.id] = String(inboundPercent(g));
    }
    setDraftPercents(draft);
    setSplitOpen(true);
  }

  async function saveSplit() {
    const percents: Record<string, number> = {};
    for (const g of goals) {
      percents[g.id] = Number(draftPercents[g.id] ?? 0);
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", { action: "setInbound", percents });
      setSplitOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inbound % must total 100");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjust() {
    const raw = Number(adjustAmount);
    if (!Number.isFinite(raw) || raw <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    const amount = adjustSign === "add" ? raw : -raw;
    if (adjustMode === "custom" && !customGoalId) {
      setError("Pick a target area for this one-time amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "adjust",
        amount,
        mode: adjustMode,
        goalId: adjustMode === "custom" ? customGoalId : undefined,
      });
      setAdjustAmount("");
      setAdjustOpen(false);
      setAdjustMode("preset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply adjustment");
    } finally {
      setBusy(false);
    }
  }

  if (shown.length === 0 && !open) {
    return (
      <section
        className="home-card home-card-save-goals"
        aria-label="Save towards something"
      >
        <div className="home-card-head">
          <p className="home-card-kicker">Save goals</p>
          <h2>Save towards something</h2>
          <p className="tiny home-card-sub">
            Gift, trip, general saving — preset where 100% of daily inbound goes.
          </p>
        </div>
        <p className="tiny save-goal-rate">
          {formatMoney(settings.monthlyIncome)} on the 1st · about{" "}
          {formatMoney(rate)} / day
        </p>
        <PrimaryButton onClick={() => setOpen(true)}>
          Add a save goal
        </PrimaryButton>
      </section>
    );
  }

  return (
    <section
      className="home-card home-card-save-goals"
      aria-label="Save goals"
    >
      <div className="home-card-head">
        <p className="home-card-kicker">Save goals</p>
        <h2>{shown.length === 0 ? "Save towards something" : "Saving toward"}</h2>
        <p className="tiny home-card-sub">
          {formatMoney(settings.monthlyIncome)} / month ·{" "}
          {formatMoney(rate)} a day · inbound chips total 100%
        </p>
      </div>

      {goals.length > 0 ? (
        <div className="save-goal-chip-row" role="group" aria-label="Daily inbound">
          {goals.map((g) => {
            const pct = inboundPercent(g);
            return (
              <button
                key={g.id}
                type="button"
                className={`chip${pct >= 100 ? " selected" : ""}`}
                disabled={busy}
                onClick={() => void claimDailyInbound(g.id)}
              >
                {g.name}
                {pct > 0 ? ` · ${pct}%` : ""}
              </button>
            );
          })}
          {goals.length > 1 ? (
            <button
              type="button"
              className="chip"
              disabled={busy}
              onClick={openSplitEditor}
            >
              Split %
            </button>
          ) : null}
        </div>
      ) : null}

      {shown.map((g) => (
        <GoalProgressRow
          key={g.id}
          goal={g}
          today={today}
          busy={busy}
          onClaimDaily={(id) => void claimDailyInbound(id)}
        />
      ))}

      {!isPage && goals.length > HOME_SAVE_GOAL_CARD_LIMIT ? (
        <p className="tiny muted">
          +{goals.length - HOME_SAVE_GOAL_CARD_LIMIT} more active
        </p>
      ) : null}

      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {splitOpen ? (
        <div className="save-goal-create">
          <p className="eyebrow">Daily inbound split</p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Percents must add to 100%. Target dates move as you change the share.
          </p>
          {goals.map((g) => {
            const draftGoal = {
              ...g,
              allocationWeight: Number(draftPercents[g.id]) || 0,
            };
            const proj = projectSaveGoalTargetDate(
              splitPreviewState,
              draftGoal,
              today,
            );
            let eta = "Add leftover to project a date";
            if (proj.status === "reached") eta = "Reached";
            else if (draftGoal.allocationWeight <= 0) {
              eta = "0% — no projected date";
            } else if (proj.targetDate) {
              eta = `On track for ${formatTargetDateLabel(proj.targetDate)}`;
            }
            return (
              <label key={g.id} className="field save-goal-split-field">
                <span className="field-label">
                  {g.name}
                  <span className="tiny save-goal-split-eta">{eta}</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="1"
                  value={draftPercents[g.id] ?? "0"}
                  onChange={(e) =>
                    setDraftPercents((prev) => ({
                      ...prev,
                      [g.id]: e.target.value,
                    }))
                  }
                />
              </label>
            );
          })}
          <p
            className="tiny"
            style={{
              margin: 0,
              color:
                Math.abs(draftPercentSum - 100) > 0.05
                  ? "var(--danger)"
                  : undefined,
            }}
          >
            Total {Math.round(draftPercentSum * 10) / 10}%
            {Math.abs(draftPercentSum - 100) > 0.05 ? " — need 100%" : ""}
          </p>
          <div className="save-goal-create-actions">
            <PrimaryButton
              onClick={() => void saveSplit()}
              disabled={busy || Math.abs(draftPercentSum - 100) > 0.05}
            >
              {busy ? "Saving…" : "Save split"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setSplitOpen(false)}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      {adjustOpen ? (
        <div className="save-goal-create">
          <p className="eyebrow">One-time add / subtract</p>
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
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="50"
            />
          </label>
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
          ) : (
            <p className="tiny muted">
              Uses the same daily inbound chips / percents.
            </p>
          )}
          <div className="save-goal-create-actions">
            <PrimaryButton onClick={() => void submitAdjust()} disabled={busy}>
              {busy ? "Saving…" : adjustSign === "add" ? "Add" : "Subtract"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setAdjustOpen(false)}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="save-goal-create">
          <p className="field-label">Quick name</p>
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
            <span className="field-label">What for?</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hawaii, Mom's gift…"
              maxLength={80}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Target amount</span>
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
              <span>Send 100% of daily inbound here</span>
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
            + Add another
          </button>
          {goals.length > 0 ? (
            <button
              type="button"
              className="save-goal-add-link"
              onClick={() => setAdjustOpen(true)}
            >
              One-time add / subtract
            </button>
          ) : null}
        </div>
      )}

      {!isPage ? (
        <Link href="/save-goals" className="btn ghost workout-open-link">
          Open save goals →
        </Link>
      ) : null}
    </section>
  );
}
