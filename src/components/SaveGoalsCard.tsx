"use client";

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
  normalizeSaveGoalSettings,
  progressRatio,
  projectSaveGoalTargetDate,
} from "@/lib/save-goals";
import type { SaveGoal } from "@/lib/types";

function GoalProgressRow({
  goal,
  today,
}: {
  goal: SaveGoal;
  today: string;
}) {
  const { state } = useApp();
  const toGo = amountToGo(goal);
  const ratio = progressRatio(goal);
  const projection = projectSaveGoalTargetDate(state, goal, today);
  const under = goal.savedAmount < 0;

  let dateLine: string;
  if (projection.status === "reached") {
    dateLine = "Reached";
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
    </article>
  );
}

export function SaveGoalsCard() {
  const { state, today, post } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const rate = today ? dailyIncomeRate(today, settings.monthlyIncome) : 0;
  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const shown = goals.slice(0, HOME_SAVE_GOAL_CARD_LIMIT);

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
      });
      setName("");
      setTarget("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create goal");
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
            Gift, trip, holiday — track what&apos;s left and when you&apos;ll get
            there.
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
          {formatMoney(rate)} a day this month
        </p>
      </div>

      {shown.map((g) => (
        <GoalProgressRow key={g.id} goal={g} today={today} />
      ))}

      {goals.length > HOME_SAVE_GOAL_CARD_LIMIT ? (
        <p className="tiny muted">
          +{goals.length - HOME_SAVE_GOAL_CARD_LIMIT} more active
        </p>
      ) : null}

      {open ? (
        <div className="save-goal-create">
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
          {error ? (
            <p className="tiny" style={{ color: "var(--danger)" }}>
              {error}
            </p>
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
        <button
          type="button"
          className="save-goal-add-link"
          onClick={() => setOpen(true)}
        >
          + Add another
        </button>
      )}
    </section>
  );
}
