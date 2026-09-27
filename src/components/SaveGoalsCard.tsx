"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  activeSaveGoals,
  amountToGo,
  dailyIncomeRate,
  formatMoney,
  formatTargetDateLabel,
  inboundPercent,
  listSaveGoalAdjustments,
  normalizeSaveGoalSettings,
  progressRatio,
  projectSaveGoalTargetDate,
} from "@/lib/save-goals";
import type { SaveGoal, SaveGoalDay } from "@/lib/types";

const NAME_PRESETS = ["Trip", "Gift", "General saving"] as const;

function GoalProgressRow({
  goal,
  today,
  onClaimDaily,
  onEdit,
  onDelete,
  busy,
}: {
  goal: SaveGoal;
  today: string;
  onClaimDaily: (id: string) => void;
  onEdit: (goal: SaveGoal) => void;
  onDelete: (goal: SaveGoal) => void;
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
    dateLine = "—";
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
        >
          {pct}% daily
        </button>
        <button
          type="button"
          className="save-goal-add-link"
          disabled={busy}
          onClick={() => onEdit(goal)}
        >
          Edit
        </button>
        <button
          type="button"
          className="save-goal-add-link"
          disabled={busy}
          onClick={() => onDelete(goal)}
        >
          Delete
        </button>
      </div>
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
  // Include archived names from state via allocation goalIds only when known
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

function AdjustPanel({
  goals,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  goals: SaveGoal[];
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (input: {
    amount: number;
    mode: "preset" | "custom";
    goalId?: string;
  }) => void;
}) {
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustSign, setAdjustSign] = useState<"add" | "subtract">("add");
  const [adjustMode, setAdjustMode] = useState<"preset" | "custom">("preset");
  const [customGoalId, setCustomGoalId] = useState(goals[0]?.id ?? "");

  return (
    <div className="save-goal-create">
      <p className="eyebrow">Adjust for the day</p>
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
      ) : null}
      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="save-goal-create-actions">
        <PrimaryButton
          disabled={busy}
          onClick={() => {
            const raw = Number(adjustAmount);
            if (!Number.isFinite(raw) || raw <= 0) return;
            onSubmit({
              amount: adjustSign === "add" ? raw : -raw,
              mode: adjustMode,
              goalId: adjustMode === "custom" ? customGoalId : undefined,
            });
          }}
        >
          {busy ? "Saving…" : adjustSign === "add" ? "Add" : "Subtract"}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

/** Home glance — no progress/to-go. Percents + approve/adjust; deep page for detail. */
function HomeSaveGoalsGlance() {
  const { state, today, post } = useApp();
  const [panel, setPanel] = useState<"none" | "approve" | "adjust">("none");
  const [spendTotal, setSpendTotal] = useState("");
  const [lumpSum, setLumpSum] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justApproved, setJustApproved] = useState(false);

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const rate = today ? dailyIncomeRate(today, settings.monthlyIncome) : 0;
  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const adjustments = useMemo(
    () => listSaveGoalAdjustments(state),
    [state],
  );
  const dayLogged = useMemo(
    () =>
      Boolean(
        today &&
          (state.saveGoalDays ?? []).some(
            (d) => d.date === today && (d.kind ?? "close") === "close",
          ),
      ),
    [state.saveGoalDays, today],
  );

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

  async function approveDay() {
    const spend = Number(spendTotal);
    if (spendTotal.trim() === "" || !Number.isFinite(spend) || spend < 0) {
      setError("Enter today’s total spend (0 or more).");
      return;
    }
    const lump = lumpSum.trim() === "" ? 0 : Number(lumpSum);
    if (!Number.isFinite(lump) || lump < 0) {
      setError("Lump sum must be 0 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "closeDay",
        date: today,
        spendTotal: spend,
        lumpSum: lump,
        lumpMode: "preset",
        source: "manual",
      });
      setPanel("none");
      setSpendTotal("");
      setLumpSum("");
      setJustApproved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve day");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjust(input: {
    amount: number;
    mode: "preset" | "custom";
    goalId?: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (input.mode === "custom" && !input.goalId) {
      setError("Pick a target area.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "adjust",
        amount: input.amount,
        mode: input.mode,
        goalId: input.goalId,
      });
      setPanel("none");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not adjust");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="home-card home-card-save-goals home-card-save-goals-glance"
      aria-label="Save goals"
    >
      <div className="home-card-head save-goal-glance-head">
        <p className="home-card-kicker save-goal-glance-kicker">Save goals</p>
        <p className="save-goal-inbound-figure" aria-label="Daily inbound">
          {formatMoney(rate)}
        </p>
      </div>

      {goals.length > 0 ? (
        <div
          className="save-goal-chip-row"
          role="group"
          aria-label="Daily inbound split"
        >
          {goals.map((g) => {
            const pct = inboundPercent(g);
            return (
              <button
                key={g.id}
                type="button"
                className={`chip${pct > 0 ? " selected" : ""}`}
                disabled={busy}
                onClick={() => void claimDailyInbound(g.id)}
                title={`Send daily inbound here (${pct}%)`}
              >
                {g.name} · {pct}%
              </button>
            );
          })}
        </div>
      ) : null}

      {panel === "approve" ? (
        <div className="save-goal-create">
          <p className="eyebrow">Approve day</p>
          <label className="field">
            <span className="field-label">Total spend</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={spendTotal}
              onChange={(e) => setSpendTotal(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">
              Lump sum
              <span className="tiny" style={{ marginLeft: 8, fontWeight: 400 }}>
                optional
              </span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={lumpSum}
              onChange={(e) => setLumpSum(e.target.value)}
              placeholder="0"
            />
          </label>
          {error ? (
            <p className="tiny" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="save-goal-create-actions">
            <PrimaryButton onClick={() => void approveDay()} disabled={busy}>
              {busy ? "Saving…" : dayLogged ? "Update day" : "Approve"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setPanel("none");
                setError("");
              }}
              disabled={busy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      {panel === "adjust" ? (
        <AdjustPanel
          goals={goals}
          busy={busy}
          error={error}
          onCancel={() => {
            setPanel("none");
            setError("");
          }}
          onSubmit={(input) => void submitAdjust(input)}
        />
      ) : null}

      {panel === "none" ? (
        <div className="save-goal-glance-actions">
          {goals.length > 0 ? (
            <>
              <PrimaryButton
                onClick={() => {
                  setError("");
                  setPanel("approve");
                }}
              >
                {dayLogged || justApproved ? "Update day" : "Approve day"}
              </PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setError("");
                  setPanel("adjust");
                }}
              >
                Adjust
              </SecondaryButton>
            </>
          ) : (
            <p className="tiny muted" style={{ margin: 0 }}>
              Set up a goal on the save goals page first.
            </p>
          )}
        </div>
      ) : null}

      {error && panel === "none" ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {panel === "none" && adjustments.length > 0 ? (
        <AdjustmentsList
          adjustments={adjustments}
          goals={[...(state.saveGoals ?? [])]}
          busy={busy}
          onRemove={(id) => void removeAdjust(id)}
        />
      ) : null}

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
  const [splitOpen, setSplitOpen] = useState(false);
  const [draftPercents, setDraftPercents] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<SaveGoal | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [deleting, setDeleting] = useState<SaveGoal | null>(null);
  const [reallocateTo, setReallocateTo] = useState<string>("");

  const settings = normalizeSaveGoalSettings(state.saveGoalSettings);
  const rate = today ? dailyIncomeRate(today, settings.monthlyIncome) : 0;
  const goals = useMemo(() => activeSaveGoals(state), [state]);
  const adjustments = useMemo(
    () => listSaveGoalAdjustments(state),
    [state],
  );

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

  async function submitAdjust(input: {
    amount: number;
    mode: "preset" | "custom";
    goalId?: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "adjust",
        amount: input.amount,
        mode: input.mode,
        goalId: input.goalId,
      });
      setAdjustOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply adjustment");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const targetAmount = Number(editTarget);
    if (!editName.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Name and a target over $0 are required.");
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
        <p className="tiny save-goal-rate">
          {formatMoney(rate)} / day
        </p>
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
        <p className="home-card-kicker">Save goals</p>
        <h2>{goals.length === 0 ? "Save towards something" : "Saving toward"}</h2>
        <p className="tiny home-card-sub">
          {formatMoney(rate)} / day
        </p>
      </div>

      {goals.length > 0 ? (
        <div
          className="save-goal-chip-row"
          role="group"
          aria-label="Daily inbound"
        >
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
              onClick={() => {
                const draft: Record<string, string> = {};
                for (const g of goals) {
                  draft[g.id] = String(inboundPercent(g));
                }
                setDraftPercents(draft);
                setSplitOpen(true);
              }}
            >
              Split %
            </button>
          ) : null}
        </div>
      ) : null}

      {goals.map((g) => (
        <GoalProgressRow
          key={g.id}
          goal={g}
          today={today}
          busy={busy}
          onClaimDaily={(id) => void claimDailyInbound(id)}
          onEdit={(goal) => {
            setEditing(goal);
            setEditName(goal.name);
            setEditTarget(String(goal.targetAmount));
            setDeleting(null);
            setError("");
          }}
          onDelete={(goal) => {
            setDeleting(goal);
            setReallocateTo("");
            setEditing(null);
            setError("");
          }}
        />
      ))}

      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="save-goal-create">
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
              inputMode="decimal"
              min={1}
              step="1"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
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
        </div>
      ) : null}

      {deleting ? (
        <div className="save-goal-create">
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
                {othersForDelete.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`chip${reallocateTo === g.id ? " selected" : ""}`}
                    onClick={() => setReallocateTo(g.id)}
                  >
                    → {g.name}
                  </button>
                ))}
              </div>
            </>
          ) : deleting.savedAmount !== 0 ? (
            <p className="tiny" style={{ margin: 0 }}>
              {formatMoney(deleting.savedAmount)} stays archived with this goal.
            </p>
          ) : null}
          <div className="save-goal-create-actions">
            <PrimaryButton onClick={() => void confirmDelete()} disabled={busy}>
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

      {splitOpen ? (
        <div className="save-goal-create">
          <p className="eyebrow">Split %</p>
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
            let eta = "—";
            if (proj.status === "reached") eta = "Reached";
            else if (draftGoal.allocationWeight <= 0) eta = "0%";
            else if (proj.targetDate) {
              eta = formatTargetDateLabel(proj.targetDate);
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
            {Math.round(draftPercentSum * 10) / 10}%
            {Math.abs(draftPercentSum - 100) > 0.05 ? " — need 100%" : ""}
          </p>
          <div className="save-goal-create-actions">
            <PrimaryButton
              onClick={() => void saveSplit()}
              disabled={busy || Math.abs(draftPercentSum - 100) > 0.05}
            >
              {busy ? "Saving…" : "Save"}
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
        <AdjustPanel
          goals={goals}
          busy={busy}
          error={error}
          onCancel={() => setAdjustOpen(false)}
          onSubmit={(input) => void submitAdjust(input)}
        />
      ) : null}

      {adjustments.length > 0 && !adjustOpen && !editing && !deleting ? (
        <AdjustmentsList
          adjustments={adjustments}
          goals={[...(state.saveGoals ?? [])]}
          busy={busy}
          onRemove={(id) => void removeAdjust(id)}
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
