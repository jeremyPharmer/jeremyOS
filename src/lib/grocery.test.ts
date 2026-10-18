import { describe, expect, it } from "vitest";
import { emptyState } from "./journey";
import {
  addGroceryItem,
  applyGroceryAction,
  normalizeGroceryItems,
  removeGroceryItem,
  sortGroceryItems,
} from "./grocery";

describe("grocery list", () => {
  it("adds and removes items", () => {
    let state = emptyState();
    state = addGroceryItem(state, "  Milk  ", "2026-10-18T12:00:00.000Z");
    expect(state.groceryItems).toHaveLength(1);
    expect(state.groceryItems![0].label).toBe("Milk");
    expect(state.groceryItems![0].checked).toBe(false);

    const id = state.groceryItems![0].id;
    state = removeGroceryItem(state, id);
    expect(state.groceryItems).toEqual([]);
  });

  it("rejects empty labels", () => {
    expect(() => addGroceryItem(emptyState(), "   ")).toThrow(/name/i);
  });

  it("sorts oldest first and drops checked leftovers", () => {
    const items = normalizeGroceryItems([
      {
        id: "a",
        label: "Eggs",
        checked: true,
        createdAt: "2026-10-18T10:00:00.000Z",
      },
      {
        id: "b",
        label: "Bread",
        checked: false,
        createdAt: "2026-10-18T11:00:00.000Z",
      },
      {
        id: "c",
        label: "Butter",
        checked: false,
        createdAt: "2026-10-18T09:00:00.000Z",
      },
    ]);
    expect(items.map((i) => i.label)).toEqual(["Bread", "Butter"]);
    expect(sortGroceryItems(items).map((i) => i.label)).toEqual([
      "Butter",
      "Bread",
    ]);
  });

  it("check/toggle removes the item (no retain)", () => {
    let state = emptyState();
    state = addGroceryItem(state, "Apples", "2026-10-18T12:00:00.000Z");
    state = addGroceryItem(state, "Oranges", "2026-10-18T12:01:00.000Z");
    const first = state.groceryItems![0].id;
    state = applyGroceryAction(state, { action: "check", id: first });
    expect(state.groceryItems!.map((i) => i.label)).toEqual(["Oranges"]);
  });

  it("applyGroceryAction routes add/remove", () => {
    let state = emptyState();
    state = applyGroceryAction(state, { action: "add", label: "Tea" });
    const id = state.groceryItems![0].id;
    state = applyGroceryAction(state, { action: "remove", id });
    expect(state.groceryItems).toEqual([]);
  });
});
