"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "@/components/AppProvider";
import { sortGroceryItems } from "@/lib/grocery";

/** Match `.tasks-item-clearing` / clear-row (~0.62s). */
const CLEAR_MS = 620;

export function GroceryListCard() {
  const { state, post } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearingIds, setClearingIds] = useState<Record<string, true>>({});
  const [error, setError] = useState("");

  const items = useMemo(
    () =>
      sortGroceryItems(state.groceryItems ?? []).filter((i) => !i.checked),
    [state.groceryItems],
  );

  async function run(
    body: Record<string, unknown>,
    opts?: { id?: string; clear?: boolean },
  ) {
    const id = opts?.id;
    if (id) setBusyId(id);
    else setBusy(true);
    setError("");
    try {
      if (id && opts?.clear) {
        setClearingIds((prev) => ({ ...prev, [id]: true }));
        await new Promise((r) => setTimeout(r, CLEAR_MS));
      }
      await post("/api/grocery", body);
    } catch (e) {
      if (id) {
        setClearingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      setError(e instanceof Error ? e.message : "Could not update list");
    } finally {
      setBusy(false);
      setBusyId(null);
      if (id) {
        setClearingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
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
    items.length === 0
      ? "Empty"
      : `${items.length} item${items.length === 1 ? "" : "s"}`;

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
                const clearing = Boolean(clearingIds[item.id]);
                const disabled = rowBusy || busy || clearing;
                return (
                  <li
                    key={item.id}
                    className={`grocery-item${
                      clearing ? " grocery-item-clearing" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="grocery-item-btn"
                      disabled={disabled}
                      aria-label={`Got ${item.label}`}
                      onClick={() =>
                        void run(
                          { action: "remove", id: item.id },
                          { id: item.id, clear: true },
                        )
                      }
                    >
                      <span
                        className={`tasks-check${
                          clearing ? " tasks-check-done" : ""
                        }`}
                        aria-hidden
                      >
                        {clearing ? "✓" : ""}
                      </span>
                      <span className="grocery-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

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
