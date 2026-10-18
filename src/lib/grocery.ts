import { newId } from "./journey";
import type { GroceryItem, RebuildState } from "./types";

const LABEL_MAX = 120;

export function normalizeGroceryItems(
  items: GroceryItem[] | undefined,
): GroceryItem[] {
  if (!items?.length) return [];
  const out: GroceryItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!id || !label) continue;
    const createdAt =
      typeof raw.createdAt === "string" && raw.createdAt
        ? raw.createdAt
        : new Date(0).toISOString();
    out.push({
      id,
      label: label.slice(0, LABEL_MAX),
      checked: Boolean(raw.checked),
      createdAt,
    });
  }
  return out;
}

/** Open items first (oldest first), then checked (oldest first). */
export function sortGroceryItems(items: GroceryItem[]): GroceryItem[] {
  const open = items
    .filter((i) => !i.checked)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = items
    .filter((i) => i.checked)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...open, ...done];
}

export function grocerySummary(items: GroceryItem[]): {
  total: number;
  open: number;
  checked: number;
} {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  return { total, open: total - checked, checked };
}

export function addGroceryItem(
  state: RebuildState,
  labelRaw: unknown,
  nowIso = new Date().toISOString(),
): RebuildState {
  const label = String(labelRaw ?? "")
    .trim()
    .slice(0, LABEL_MAX);
  if (!label) {
    throw Object.assign(new Error("Item needs a name"), { status: 400 });
  }
  const item: GroceryItem = {
    id: newId("gr"),
    label,
    checked: false,
    createdAt: nowIso,
  };
  return {
    ...state,
    groceryItems: [...normalizeGroceryItems(state.groceryItems), item],
  };
}

export function toggleGroceryItem(
  state: RebuildState,
  idRaw: unknown,
): RebuildState {
  const id = String(idRaw ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("Missing item"), { status: 400 });
  }
  const items = normalizeGroceryItems(state.groceryItems);
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) {
    throw Object.assign(new Error("Item not found"), { status: 404 });
  }
  const next = items.map((i, n) =>
    n === idx ? { ...i, checked: !i.checked } : i,
  );
  return { ...state, groceryItems: next };
}

export function removeGroceryItem(
  state: RebuildState,
  idRaw: unknown,
): RebuildState {
  const id = String(idRaw ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("Missing item"), { status: 400 });
  }
  const items = normalizeGroceryItems(state.groceryItems);
  if (!items.some((i) => i.id === id)) {
    throw Object.assign(new Error("Item not found"), { status: 404 });
  }
  return {
    ...state,
    groceryItems: items.filter((i) => i.id !== id),
  };
}

export function clearCheckedGroceryItems(state: RebuildState): RebuildState {
  const items = normalizeGroceryItems(state.groceryItems);
  return {
    ...state,
    groceryItems: items.filter((i) => !i.checked),
  };
}

export function applyGroceryAction(
  state: RebuildState,
  body: Record<string, unknown>,
  nowIso = new Date().toISOString(),
): RebuildState {
  const action = String(body.action ?? "");
  if (action === "add") return addGroceryItem(state, body.label, nowIso);
  if (action === "toggle") return toggleGroceryItem(state, body.id);
  if (action === "remove") return removeGroceryItem(state, body.id);
  if (action === "clearChecked") return clearCheckedGroceryItems(state);
  throw Object.assign(new Error("Unknown grocery action"), { status: 400 });
}
