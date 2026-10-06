"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  activeSaveGoals,
  amountToGo,
  floorDollar,
  formatMoney,
  formatMoneyDown,
  formatTargetDateLabel,
  goalDollarsPerDay,
  isReserveGoal,
  leftoverBeforeApply,
  listSaveGoalAdjustmentsForGoal,
  listSaveGoalSpendEntries,
  progressRatio,
  projectSaveGoalTargetDate,
  SAVE_GOAL_LEDGER_START,
  SAVE_GOAL_SPEND_CATEGORIES,
  saveGoalCloseForDate,
  saveGoalSpendEntryLabel,
} from "@/lib/save-goals";
import type {
  SaveGoal,
  SaveGoalSpendCategory,
} from "@/lib/types";

const NAME_PRESETS = ["Trip", "Gift", "General saving"] as const;

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
  onTransfer,
  busy,
}: {
  goal: SaveGoal;
  today: string;
  onEdit: (goal: SaveGoal) => void;
  onRemoveAdjust: (id: string) => void;
  onTransfer?: () => void;
  busy: boolean;
}) {
  const { state } = useApp();
  const reserve = isReserveGoal(goal);
  const toGo = amountToGo(goal);
  const ratio = progressRatio(goal);
  const projection = projectSaveGoalTargetDate(state, goal, today);
  const under = goal.savedAmount < 0;
  const daily = goalDollarsPerDay(goal);

  let dateLine: string | null = null;
  if (!reserve) {
    if (projection.status === "reached") {
      dateLine = "Reached";
    } else if (projection.targetDate) {
      dateLine = formatTargetDateLabel(projection.targetDate);
    } else if (daily <= 0) {
      dateLine = "Set $/day to project";
    }
  }

  return (
    <article className="save-goal-row" aria-label={goal.name}>
      <div className="save-goal-row-head">
        <h3 className="save-goal-name">{goal.name}</h3>
        {reserve ? (
          <p className="save-goal-togo">
            {formatMoney(Math.max(0, goal.savedAmount))}{" "}
            <span className="save-goal-togo-label">available</span>
          </p>
        ) : (
          <p className="save-goal-togo">
            {formatMoney(toGo)}{" "}
            <span className="save-goal-togo-label">to go</span>
          </p>
        )}
      </div>
      {!reserve ? (
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
      ) : null}
      <div className="save-goal-meta">
        {reserve ? (
          <span className="tiny muted">Holding tank — fund goals from here</span>
        ) : (
          <span className="tiny">
            {formatMoney(Math.max(0, goal.savedAmount))} of{" "}
            {formatMoney(goal.targetAmount)}
            {daily > 0 ? (
              <>
                {" "}
                · {formatMoneyDown(daily)}/day
              </>
            ) : null}
            {under ? (
              <span className="save-goal-under">
                {" "}
                · {formatMoney(Math.abs(goal.savedAmount))} under
              </span>
            ) : null}
          </span>
        )}
        {dateLine ? (
          <span className="tiny save-goal-eta">{dateLine}</span>
        ) : null}
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
        {reserve && onTransfer ? (
          <button
            type="button"
            className="save-goal-add-link"
            disabled={busy || goal.savedAmount <= 0}
            onClick={onTransfer}
          >
            Transfer
          </button>
        ) : null}
      </div>
      <GoalAdjustmentLog
        goalId={goal.id}
        busy={busy}
        onRemove={onRemoveAdjust}
      />
    </article>
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

function TransferFromReservePanel({
  reserve,
  namedGoals,
  today,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  reserve: SaveGoal;
  namedGoals: SaveGoal[];
  today: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (input: {
    date: string;
    amount: number;
    toGoalId: string;
  }) => void;
}) {
  const [transferDate, setTransferDate] = useState(
    () => today || SAVE_GOAL_LEDGER_START,
  );
  const [amount, setAmount] = useState("");
  const [toGoalId, setToGoalId] = useState(namedGoals[0]?.id ?? "");
  const available = Math.max(0, reserve.savedAmount);

  useEffect(() => {
    if (today && (!transferDate || transferDate > today)) {
      setTransferDate(today);
    }
  }, [today, transferDate]);

  useEffect(() => {
    if (!toGoalId && namedGoals[0]) setToGoalId(namedGoals[0].id);
  }, [namedGoals, toGoalId]);

  return (
    <div className="save-goal-create">
      <p className="eyebrow">Transfer from Reserve</p>
      <p className="tiny muted" style={{ margin: "0 0 10px" }}>
        {formatMoney(available)} available
      </p>
      <label className="field">
        <span className="field-label">Date</span>
        <input
          type="date"
          value={transferDate}
          min={SAVE_GOAL_LEDGER_START}
          max={today || undefined}
          onChange={(e) => setTransferDate(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">Amount</span>
        <input
          type="number"
          inputMode="decimal"
          min={0.01}
          step="0.01"
          max={available}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
          autoFocus
        />
      </label>
      <p className="field-label" style={{ marginBottom: 6 }}>
        Into
      </p>
      <div className="chip-row">
        {namedGoals.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`chip${toGoalId === g.id ? " selected" : ""}`}
            onClick={() => setToGoalId(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>
      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="save-goal-create-actions">
        <PrimaryButton
          disabled={busy || !transferDate || !toGoalId || available <= 0}
          onClick={() => {
            const raw = Number(amount);
            if (!transferDate || !toGoalId) return;
            if (!Number.isFinite(raw) || raw <= 0) return;
            onSubmit({ date: transferDate, amount: raw, toGoalId });
          }}
        >
          {busy ? "Saving…" : "Transfer"}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

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
            Credits Reserve (holding tank) for this date.
          </p>
        )}
      </div>
      {!isInbound ? (
        <>
          <p className="field-label" style={{ marginBottom: 6 }}>
            Apply to
          </p>
          <div className="chip-row">
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
        </>
      ) : null}
      {error ? (
        <p className="tiny" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="save-goal-create-actions">
        <PrimaryButton
          disabled={busy || !adjustDate || !reasonPreset || (!isInbound && !customGoalId)}
          onClick={() => {
            if (!adjustDate) return;
            const raw = Number(adjustAmount);
            if (!Number.isFinite(raw) || raw < 0) return;
            if (isInbound) {
              if (raw <= 0) return;
              onSetInbound({ date: adjustDate, amount: raw });
              return;
            }
            if (raw <= 0 || !customGoalId) return;
            onSubmit({
              date: adjustDate,
              amount: adjustSign === "add" ? raw : -raw,
              mode: "custom",
              goalId: customGoalId,
              note: reasonNote(),
            });
          }}
        >
          {busy
            ? "Saving…"
            : isInbound
              ? "Credit Reserve"
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

/** Full save-goals surface — ledger-only (daily inbound / % mix paused). */
function SaveGoalsDetail() {
  const { state, today, post } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [createDaily, setCreateDaily] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<SaveGoal | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSaved, setEditSaved] = useState("");
  const [editDaily, setEditDaily] = useState("");
  const [deleting, setDeleting] = useState<SaveGoal | null>(null);
  const [reallocateTo, setReallocateTo] = useState<string>("");

  const goals = useMemo(() => {
    const all = activeSaveGoals(state);
    return [...all].sort((a, b) => {
      const ar = isReserveGoal(a) ? 0 : 1;
      const br = isReserveGoal(b) ? 0 : 1;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
  }, [state]);
  const reserve = goals.find((g) => isReserveGoal(g)) ?? null;
  const namedGoals = goals.filter((g) => !isReserveGoal(g));

  async function create() {
    const targetAmount = Number(target);
    const dollarsPerDay = Number(createDaily);
    if (!name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Name and a target over $0 are required.");
      return;
    }
    if (createDaily !== "" && (!Number.isFinite(dollarsPerDay) || dollarsPerDay < 0)) {
      setError("Enter a daily amount of $0 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "create",
        name: name.trim(),
        targetAmount,
        claimDailyInbound: false,
        ...(createDaily !== "" && Number.isFinite(dollarsPerDay)
          ? { dollarsPerDay }
          : {}),
      });
      setName("");
      setTarget("");
      setCreateDaily("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create goal");
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
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      setError("Enter an inbound greater than 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "creditReserve",
        date: input.date,
        amount: input.amount,
        note: "Inbound",
      });
      setAdjustOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not credit Reserve");
    } finally {
      setBusy(false);
    }
  }

  async function submitTransfer(input: {
    date: string;
    amount: number;
    toGoalId: string;
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      setError("Pick a date for the transfer.");
      return;
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "transferFromReserve",
        date: input.date,
        amount: input.amount,
        toGoalId: input.toGoalId,
      });
      setTransferOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not transfer");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const reserve = isReserveGoal(editing);
    const targetAmount = Number(editTarget);
    const savedAmount = Number(editSaved);
    const dollarsPerDay = Number(editDaily);
    if (!reserve) {
      if (!editName.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
        setError("Name and a target over $0 are required.");
        return;
      }
      if (!Number.isFinite(dollarsPerDay) || dollarsPerDay < 0) {
        setError("Enter a daily amount of $0 or more.");
        return;
      }
    }
    if (!Number.isFinite(savedAmount)) {
      setError("Enter a saved total.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/api/save-goals", {
        action: "update",
        id: editing.id,
        ...(reserve
          ? {}
          : {
              name: editName.trim(),
              targetAmount,
              dollarsPerDay,
            }),
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

  if (goals.length === 0 && !open) {
    return (
      <section
        className="home-card home-card-save-goals"
        aria-label="Save towards something"
      >
        <div className="home-card-head">
          <p className="home-card-kicker">Save goals</p>
          <h2>Save towards something</h2>
          <p className="tiny muted" style={{ margin: "4px 0 0" }}>
            Manual adjustments only — daily inbound is paused.
          </p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>
          Add a save goal
        </PrimaryButton>
      </section>
    );
  }

  const othersForDelete = deleting
    ? goals.filter((g) => g.id !== deleting.id && !isReserveGoal(g))
    : [];

  return (
    <section
      className="home-card home-card-save-goals"
      aria-label="Save goals"
    >
      <div className="home-card-head">
        <div>
          <p className="home-card-kicker">Save goals</p>
          <h2>{goals.length === 0 ? "Save towards something" : "Ledger"}</h2>
          <p className="tiny muted" style={{ margin: "4px 0 0" }}>
            Money lands in Reserve; transfer into goals. Set $/day for a payoff date.
          </p>
        </div>
      </div>

      {goals.map((g) => (
        <div key={g.id}>
          <GoalProgressRow
            goal={g}
            today={today}
            busy={busy}
            onRemoveAdjust={(id) => void removeAdjust(id)}
            onTransfer={
              isReserveGoal(g) && namedGoals.length > 0
                ? () => {
                    setTransferOpen(true);
                    setAdjustOpen(false);
                    setEditing(null);
                    setError("");
                  }
                : undefined
            }
            onEdit={(goal) => {
              setEditing(goal);
              setEditName(goal.name);
              setEditTarget(String(goal.targetAmount));
              setEditSaved(String(floorDollar(goal.savedAmount)));
              setEditDaily(String(goalDollarsPerDay(goal) || ""));
              setDeleting(null);
              setReallocateTo("");
              setTransferOpen(false);
              setError("");
            }}
          />
          {editing?.id === g.id && !deleting ? (
            <div className="save-goal-create" style={{ marginTop: 8 }}>
              <p className="eyebrow">Edit</p>
              {!isReserveGoal(g) ? (
                <>
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
                    <span className="field-label">$/day toward goal</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={editDaily}
                      onChange={(e) => setEditDaily(e.target.value)}
                      placeholder="10"
                    />
                  </label>
                </>
              ) : (
                <p className="tiny muted" style={{ margin: "0 0 8px" }}>
                  Reserve is the holding tank — adjust the balance only.
                </p>
              )}
              <label className="field">
                <span className="field-label">
                  {isReserveGoal(g) ? "Balance" : "Saved toward goal"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={editSaved}
                  onChange={(e) => setEditSaved(e.target.value)}
                  autoFocus={isReserveGoal(g)}
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
              {!isReserveGoal(g) ? (
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
              ) : null}
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

      {transferOpen && reserve && namedGoals.length > 0 ? (
        <TransferFromReservePanel
          reserve={reserve}
          namedGoals={namedGoals}
          today={today ?? SAVE_GOAL_LEDGER_START}
          busy={busy}
          error={error}
          onCancel={() => setTransferOpen(false)}
          onSubmit={(input) => void submitTransfer(input)}
        />
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
          <label className="field">
            <span className="field-label">$/day toward goal (optional)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={createDaily}
              onChange={(e) => setCreateDaily(e.target.value)}
              placeholder="10"
            />
          </label>
          <div className="save-goal-create-actions">
            <PrimaryButton onClick={() => void create()} disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setOpen(false);
                setCreateDaily("");
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
            onClick={() => {
              setOpen(true);
              setTransferOpen(false);
              setAdjustOpen(false);
            }}
          >
            + Add
          </button>
          {reserve && namedGoals.length > 0 ? (
            <button
              type="button"
              className="save-goal-add-link"
              onClick={() => {
                setTransferOpen(true);
                setAdjustOpen(false);
                setOpen(false);
                setError("");
              }}
            >
              Transfer
            </button>
          ) : null}
          {goals.length > 0 ? (
            <button
              type="button"
              className="save-goal-add-link"
              onClick={() => {
                setAdjustOpen(true);
                setTransferOpen(false);
                setOpen(false);
              }}
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
