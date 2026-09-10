"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { TodoComposer, type TodoComposerPayload } from "@/components/TodoComposer";
import { PrimaryButton, ScaleInput, SecondaryButton } from "@/components/ui";
import { quoteById } from "@/lib/quotes";
import { openTodosOn } from "@/lib/todos";

export default function MorningPage() {
  const { post, state, dashboard, today, refresh } = useApp();
  const router = useRouter();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(6);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [stress, setStress] = useState(5);
  const [intention, setIntention] = useState("");
  const [trigger, setTrigger] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [itemBusy, setItemBusy] = useState(false);
  const [clearingIds, setClearingIds] = useState<string[]>([]);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const todayMorning = state.mornings.find((m) => m.date === today);
  const quote = useMemo(
    () => quoteById(todayMorning?.quoteId),
    [todayMorning?.quoteId],
  );
  const todayItems = openTodosOn(state.dayProvisions ?? [], today);
  /** Morning already saved for today (or just submitted this session). */
  const morningDone = Boolean(todayMorning) || done;
  const shownIntention = intention.trim() || todayMorning?.intention || "";

  async function submit() {
    setBusy(true);
    setError("");
    try {
      // Mark done before post settles so a refresh race can't land on a dead-end.
      setDone(true);
      await post("/api/morning", {
        date: today,
        sleepHours,
        sleepQuality,
        mood,
        energy,
        stress,
        intention,
        trigger: trigger || undefined,
      });
    } catch (e) {
      setDone(false);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function addItem(payload: TodoComposerPayload) {
    setItemBusy(true);
    try {
      await post("/api/todos", {
        action: "add",
        label: payload.label,
        date: payload.date,
        time: payload.time,
        recurrence: payload.recurrence,
      });
      setItemOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add item");
    } finally {
      setItemBusy(false);
    }
  }

  async function completeTodo(id: string) {
    if (rowBusyId || clearingIds.includes(id)) return;
    setRowBusyId(id);
    setClearingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    try {
      await new Promise((r) => setTimeout(r, 420));
      await post("/api/todos", { action: "complete", id });
    } catch (e) {
      setClearingIds((prev) => prev.filter((x) => x !== id));
      setError(e instanceof Error ? e.message : "Could not complete");
    } finally {
      setRowBusyId(null);
    }
  }

  if (morningDone) {
    return (
      <main className="stack fade-in">
        {quote && (
          <section className="panel morning-quote">
            <p className="morning-quote-text">&ldquo;{quote.text}&rdquo;</p>
            <p className="tiny morning-quote-attr">— {quote.attribution}</p>
          </section>
        )}
        <p className="eyebrow">Today&apos;s Items</p>
        <h1>Set yourself up.</h1>
        <div className="panel list-check">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Today — tap to check off
          </p>
          {todayItems.map((p) => {
            const clearing = clearingIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`check-item check-item-btn${clearing ? " done clearing" : ""}`}
                disabled={Boolean(rowBusyId)}
                onClick={() => void completeTodo(p.id)}
              >
                <span className={`check-box${clearing ? " checked" : ""}`}>
                  {clearing ? "✓" : ""}
                </span>
                <span className="check-label">{p.label}</span>
              </button>
            );
          })}
          {todayItems.length === 0 && !itemOpen ? (
            <p className="muted" style={{ margin: "4px 0 8px" }}>
              List is clear — into the day whenever you&apos;re ready.
            </p>
          ) : null}
          <button
            type="button"
            className="todo-add-toggle"
            onClick={() => setItemOpen(true)}
          >
            <span>Add an item for today</span>
            <span className="morning-add-plus" aria-hidden>
              +
            </span>
          </button>
          {itemOpen && (
            <TodoComposer
              today={today}
              busy={itemBusy}
              onSubmit={addItem}
              onCancel={() => setItemOpen(false)}
            />
          )}
        </div>
        {shownIntention ? (
          <div className="panel">
            <p className="eyebrow">Today&apos;s intention</p>
            <p style={{ margin: 0, fontSize: "1.15rem" }}>{shownIntention}</p>
          </div>
        ) : null}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <PrimaryButton onClick={() => router.push("/")}>
          Into the day
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main className="stack fade-in">
      <p className="eyebrow">Prepare</p>
      <h1>Start the day</h1>
      <p className="muted">About 2–4 minutes. Not a medical form.</p>

      <section className="panel">
        <p className="eyebrow">Sleep</p>
        <ScaleInput
          label="Hours slept"
          value={sleepHours}
          min={0}
          max={14}
          step={0.5}
          onChange={setSleepHours}
        />
        <ScaleInput
          label="Sleep quality"
          value={sleepQuality}
          onChange={setSleepQuality}
        />
      </section>

      <section className="panel">
        <p className="eyebrow">Current state</p>
        <ScaleInput label="Mood" value={mood} onChange={setMood} />
        <ScaleInput label="Energy" value={energy} onChange={setEnergy} />
        <ScaleInput label="Stress" value={stress} onChange={setStress} />
      </section>

      <section className="panel">
        <p className="eyebrow">Alignment</p>
        <label className="field">
          <span className="field-label">
            Any trigger or concern for today
          </span>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="field">
          <span className="field-label">
            What&apos;s the one thing you want to do well today?
          </span>
          <input
            type="text"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="One short line"
          />
        </label>
      </section>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <PrimaryButton onClick={submit} disabled={busy || !intention.trim()}>
        {busy ? "Saving…" : "Continue"}
      </PrimaryButton>
      <SecondaryButton onClick={() => router.push("/")}>Cancel</SecondaryButton>
      {dashboard && (
        <p className="tiny" style={{ textAlign: "center" }}>
          {dashboard.label}
        </p>
      )}
    </main>
  );
}
