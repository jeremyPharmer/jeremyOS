"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useEffectEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useApp } from "@/components/AppProvider";
import {
  bannerText,
  buildGrid,
  normalizeDailyCrossword,
  puzzleForDate,
  todayFillPercent,
  type CrosswordCell,
} from "@/lib/crossword";

export function DailyCrosswordCard() {
  const { state, today, post } = useApp();
  const puzzle = useMemo(() => puzzleForDate(today), [today]);
  const grid = useMemo(() => buildGrid(puzzle), [puzzle]);
  const dc = normalizeDailyCrossword(state.dailyCrossword);
  const progress =
    dc.current?.date === today ? dc.current : undefined;
  const started = Boolean(progress?.started);
  const solved = Boolean(progress?.solved);

  const [cells, setCells] = useState<string[]>(
    () => progress?.cells ?? grid.map((c) => (c.black ? "#" : "")),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cellRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (progress?.cells?.length) {
      setCells(progress.cells);
    } else {
      setCells(grid.map((c) => (c.black ? "#" : "")));
    }
  }, [today, progress?.date, progress?.started, progress?.solved, grid]);

  const pct = todayFillPercent(puzzle, started ? cells : undefined);
  const banner = bannerText(dc.completed, dc.attempts, pct, started);

  const persist = useEffectEvent(async (nextCells: string[]) => {
    setError("");
    try {
      await post("/api/crossword", {
        action: "save",
        date: today,
        cells: nextCells,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  });

  function queueSave(nextCells: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(nextCells);
    }, 280);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // After Start, focus the first white cell so the keyboard can open on tap
  useEffect(() => {
    if (!started || solved) return;
    const first = grid.find((c) => !c.black);
    if (!first) return;
    setSelected(first.index);
  }, [started, solved, grid]);

  async function onStart() {
    setBusy(true);
    setError("");
    try {
      await post("/api/crossword", { action: "start", date: today });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  function focusCell(index: number) {
    if (solved) return;
    const cell = grid[index];
    if (!cell || cell.black) return;
    setSelected(index);
    const el = cellRefs.current.get(index);
    el?.focus();
    el?.select();
  }

  function nextWhite(from: number, dir: 1 | -1): number | null {
    let i = from + dir;
    while (i >= 0 && i < grid.length) {
      if (!grid[i]!.black) return i;
      i += dir;
    }
    return null;
  }

  function setLetterAt(index: number, letter: string, advance: boolean) {
    const next = [...cells];
    next[index] = letter;
    setCells(next);
    queueSave(next);
    if (advance) {
      const n = nextWhite(index, 1);
      if (n != null) {
        setSelected(n);
        requestAnimationFrame(() => {
          const el = cellRefs.current.get(n);
          el?.focus();
          el?.select();
        });
      }
    }
  }

  function onCellChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    if (solved) return;
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleaned) {
      setLetterAt(index, "", false);
      return;
    }
    setLetterAt(index, cleaned.slice(-1), true);
  }

  function onCellKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (solved) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      if (cells[index]) {
        // let onChange clear via empty value
        return;
      }
      e.preventDefault();
      const prev = nextWhite(index, -1);
      if (prev != null) {
        const next = [...cells];
        next[prev] = "";
        setCells(next);
        queueSave(next);
        setSelected(prev);
        requestAnimationFrame(() => {
          const el = cellRefs.current.get(prev);
          el?.focus();
          el?.select();
        });
      }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const n = nextWhite(index, 1);
      if (n != null) focusCell(n);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = nextWhite(index, -1);
      if (n != null) focusCell(n);
    }
  }

  return (
    <section className="home-card home-card-crossword" aria-label="Daily crossword">
      <div className="home-card-head">
        <p className="home-card-kicker">Daily crossword</p>
        <h2>Today&apos;s puzzle</h2>
        <p className="tiny home-card-sub">
          {solved
            ? "Solved"
            : started
              ? "Tap a square, then type"
              : "5×5 interlocking · sharper clues"}
        </p>
      </div>

      {!started ? (
        <button
          type="button"
          className="btn primary crossword-start"
          disabled={busy}
          onClick={() => void onStart()}
        >
          {busy ? "Starting…" : "Start today's crossword"}
        </button>
      ) : (
        <>
          <div
            className={`crossword-grid${solved ? " solved" : ""}`}
            role="grid"
            aria-label="Crossword grid"
          >
            {grid.map((cell) => (
              <GridCell
                key={cell.index}
                cell={cell}
                value={cells[cell.index] || ""}
                selected={selected === cell.index}
                solved={solved}
                inputRef={(el) => {
                  if (el) cellRefs.current.set(cell.index, el);
                  else cellRefs.current.delete(cell.index);
                }}
                onFocus={() => setSelected(cell.index)}
                onChange={(e) => onCellChange(cell.index, e)}
                onKeyDown={(e) => onCellKeyDown(cell.index, e)}
              />
            ))}
          </div>

          <div className="crossword-clues">
            <div>
              <p className="crossword-clue-head">Across</p>
              <ul>
                {puzzle.across.map((c) => (
                  <li key={`a-${c.num}`}>
                    <strong>{c.num}.</strong> {c.clue}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="crossword-clue-head">Down</p>
              <ul>
                {puzzle.down.map((c) => (
                  <li key={`d-${c.num}`}>
                    <strong>{c.num}.</strong> {c.clue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {error ? <p className="error tiny">{error}</p> : null}

      <p className="crossword-banner" aria-live="polite">
        {banner}
      </p>
    </section>
  );
}

function GridCell({
  cell,
  value,
  selected,
  solved,
  inputRef,
  onFocus,
  onChange,
  onKeyDown,
}: {
  cell: CrosswordCell;
  value: string;
  selected: boolean;
  solved: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onFocus: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  if (cell.black) {
    return <div className="crossword-cell black" aria-hidden />;
  }
  return (
    <div
      className={`crossword-cell${selected ? " selected" : ""}${solved ? " done" : ""}`}
    >
      {cell.number != null ? (
        <span className="crossword-num">{cell.number}</span>
      ) : null}
      <input
        ref={inputRef}
        className="crossword-cell-input"
        type="text"
        inputMode="text"
        enterKeyHint="next"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={2}
        value={value}
        disabled={solved}
        aria-label={
          cell.number
            ? `Cell ${cell.number}${value ? `, ${value}` : ""}`
            : value || "Empty cell"
        }
        onFocus={onFocus}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
