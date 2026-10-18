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
    // Checked rows are not retained — drop any leftover from older builds.
    if (raw.checked) continue;
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
      checked: false,
      createdAt,
    });
  }
  return out;
}

/** Oldest first (open list only — checked items are not retained). */
export function sortGroceryItems(items: GroceryItem[]): GroceryItem[] {
  return [...items]
    .filter((i) => !i.checked)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

export function applyGroceryAction(
  state: RebuildState,
  body: Record<string, unknown>,
  nowIso = new Date().toISOString(),
): RebuildState {
  const action = String(body.action ?? "");
  if (action === "add") return addGroceryItem(state, body.label, nowIso);
  // Check-off and remove are the same — items are not retained.
  if (action === "remove" || action === "toggle" || action === "check") {
    return removeGroceryItem(state, body.id);
  }
  if (action === "clearChecked") {
    // No-op now that checked rows are dropped on normalize.
    return { ...state, groceryItems: normalizeGroceryItems(state.groceryItems) };
  }
  throw Object.assign(new Error("Unknown grocery action"), { status: 400 });
}
