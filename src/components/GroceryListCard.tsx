"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "@/components/AppProvider";
import {
  grocerySummary,
  sortGroceryItems,
} from "@/lib/grocery";

export function GroceryListCard() {
  const { state, post } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const items = useMemo(
    () => sortGroceryItems(state.groceryItems ?? []),
    [state.groceryItems],
  );
  const summary = useMemo(() => grocerySummary(items), [items]);

  async function run(
    body: Record<string, unknown>,
    opts?: { id?: string },
  ) {
    if (opts?.id) setBusyId(opts.id);
    else setBusy(true);
    setError("");
    try {
      await post("/api/grocery", body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update list");
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label || busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/grocery", { action: "add", label });
      setDraft("");
      if (!open) setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  const meta =
    summary.total === 0
      ? "Empty"
      : summary.open === 0
        ? `${summary.total} done`
        : summary.checked > 0
          ? `${summary.open} left · ${summary.checked} done`
          : `${summary.open} item${summary.open === 1 ? "" : "s"}`;

  return (
    <section
      className={`home-card home-card-grocery${open ? " open" : ""}`}
      aria-label="Grocery list"
    >
      <button
        type="button"
        className="grocery-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="grocery-header">
          <p className="home-card-kicker">Grocery</p>
          <p className="tiny grocery-collapsed-meta">{meta}</p>
        </div>
        <span className={`podcast-caret${open ? " open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="grocery-body fade-in">
          <form className="grocery-add" onSubmit={(e) => void onAdd(e)}>
            <input
              type="text"
              className="grocery-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add an item"
              maxLength={120}
              aria-label="Grocery item"
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn ghost grocery-add-btn"
              disabled={busy || !draft.trim()}
            >
              Add
            </button>
          </form>

          {items.length === 0 ? (
            <p className="tiny muted grocery-empty">Nothing on the list yet.</p>
          ) : (
            <ul className="grocery-list">
              {items.map((item) => {
                const rowBusy = busyId === item.id;
                return (
                  <li
                    key={item.id}
                    className={`grocery-item${item.checked ? " done" : ""}`}
                  >
                    <button
                      type="button"
                      className="tasks-check-btn"
                      disabled={rowBusy || busy}
                      aria-label={
                        item.checked
                          ? `Uncheck ${item.label}`
                          : `Check ${item.label}`
                      }
                      onClick={() =>
                        void run(
                          { action: "toggle", id: item.id },
                          { id: item.id },
                        )
                      }
                    >
                      <span
                        className={`tasks-check${
                          item.checked ? " tasks-check-done" : ""
                        }`}
                      >
                        {item.checked ? "✓" : ""}
                      </span>
                    </button>
                    <span className="grocery-label">{item.label}</span>
                    <button
                      type="button"
                      className="tasks-action-btn grocery-remove"
                      disabled={rowBusy || busy}
                      aria-label={`Remove ${item.label}`}
                      onClick={() =>
                        void run(
                          { action: "remove", id: item.id },
                          { id: item.id },
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {summary.checked > 0 ? (
            <button
              type="button"
              className="btn ghost grocery-clear"
              disabled={busy}
              onClick={() => void run({ action: "clearChecked" })}
            >
              Clear checked
            </button>
          ) : null}

          {error ? (
            <p className="tiny" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
