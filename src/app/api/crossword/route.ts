import { NextResponse } from "next/server";
import { applyCrosswordAction } from "@/lib/crossword";
import { updateState } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const date = String(body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (
      action !== "start" &&
      action !== "save" &&
      action !== "complete" &&
      action !== "reveal"
    ) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const cells = Array.isArray(body.cells)
      ? body.cells.map((c: unknown) => String(c ?? ""))
      : undefined;

    if (action === "start") {
      const state = await updateState((prev) =>
        applyCrosswordAction(prev, { action: "start", date }),
      );
      return NextResponse.json({ state });
    }

    if (action === "save") {
      if (!cells) {
        return NextResponse.json({ error: "Missing cells" }, { status: 400 });
      }
      const state = await updateState((prev) =>
        applyCrosswordAction(prev, { action: "save", date, cells }),
      );
      return NextResponse.json({ state });
    }

    if (action === "reveal") {
      const state = await updateState((prev) =>
        applyCrosswordAction(prev, { action: "reveal", date }),
      );
      return NextResponse.json({ state });
    }

    const state = await updateState((prev) =>
      applyCrosswordAction(prev, {
        action: "complete",
        date,
        cells,
      }),
    );
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
