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
  clearEntryCells,
  correctWordCellIndexes,
  entryForCell,
  entryForCellPrefer,
  entryHasLetters,
  isWordCorrect,
  nextCellInDirection,
  normalizeDailyCrossword,
  puzzleForDate,
  type CrosswordCell,
  type CrosswordDir,
  type CrosswordEntry,
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
  const revealed = Boolean(progress?.revealed);
  const locked = solved || revealed;

  const [cells, setCells] = useState<string[]>(
    () => progress?.cells ?? grid.map((c) => (c.black ? "#" : "")),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [direction, setDirection] = useState<CrosswordDir>("across");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cellRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ index: number; at: number } | null>(null);

  useEffect(() => {
    if (progress?.cells?.length) {
      setCells(progress.cells);
    } else {
      setCells(grid.map((c) => (c.black ? "#" : "")));
    }
  }, [
    today,
    progress?.date,
    progress?.started,
    progress?.solved,
    progress?.revealed,
    grid,
  ]);

  const banner = bannerText(dc.completed, dc.attempts);
  const correctCells = useMemo(() => {
    if (!started || revealed) return new Set<number>();
    if (solved) {
      return new Set(grid.filter((c) => !c.black).map((c) => c.index));
    }
    return correctWordCellIndexes(puzzle, cells);
  }, [started, revealed, solved, puzzle, cells, grid]);

  const activeEntry: CrosswordEntry | null = useMemo(() => {
    if (selected == null) return null;
    return entryForCellPrefer(puzzle, selected, direction);
  }, [puzzle, selected, direction]);

  const activeIndexes = useMemo(() => {
    return new Set(activeEntry?.indexes ?? []);
  }, [activeEntry]);

  const canClear = Boolean(
    !locked &&
      activeEntry &&
      entryHasLetters(cells, activeEntry.indexes) &&
      !isWordCorrect(puzzle, cells, activeEntry.num, activeEntry.dir),
  );

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
    if (!started || locked) return;
    const first = grid.find((c) => !c.black);
    if (!first) return;
    setSelected(first.index);
    setDirection("across");
  }, [started, locked, grid]);

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

  async function onReveal() {
    if (locked || busy) return;
    setBusy(true);
    setError("");
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await post("/api/crossword", { action: "reveal", date: today });
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not solve");
    } finally {
      setBusy(false);
    }
  }

  function focusCell(index: number, dir?: CrosswordDir) {
    if (locked) return;
    const cell = grid[index];
    if (!cell || cell.black) return;
    if (dir) setDirection(dir);
    setSelected(index);
    const el = cellRefs.current.get(index);
    el?.focus();
    el?.select();
  }

  function onCellPointerDown(index: number) {
    if (locked) return;
    const now = Date.now();
    const prev = lastTap.current;
    // Second tap on the same square flips Across ↔ Down (NYT-style).
    if (prev && prev.index === index && now - prev.at < 450) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      const prefer = entryForCell(puzzle, index, direction)
        ? direction
        : entryForCell(puzzle, index, "across")
          ? "across"
          : "down";
      setDirection(prefer);
    }
    lastTap.current = { index, at: now };
    setSelected(index);
  }

  function setLetterAt(index: number, letter: string, advance: boolean) {
    if (locked) return;
    const next = [...cells];
    next[index] = letter;
    setCells(next);
    queueSave(next);
    if (advance) {
      const entry = entryForCellPrefer(puzzle, index, direction);
      const dir = entry?.dir ?? direction;
      if (entry) setDirection(dir);
      const n = nextCellInDirection(puzzle, index, dir, 1);
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

  function onClearActive() {
    if (!canClear || !activeEntry) return;
    const next = clearEntryCells(cells, activeEntry.indexes);
    setCells(next);
    queueSave(next);
    const start = activeEntry.indexes[0];
    if (start != null) focusCell(start, activeEntry.dir);
  }

  function selectClue(num: number, dir: CrosswordDir) {
    if (locked) return;
    for (let i = 0; i < grid.length; i++) {
      const e = entryForCell(puzzle, i, dir);
      if (e?.num === num) {
        focusCell(e.indexes[0]!, dir);
        return;
      }
    }
  }

  function onCellChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    if (locked) return;
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleaned) {
      setLetterAt(index, "", false);
      return;
    }
    setLetterAt(index, cleaned.slice(-1), true);
  }

  function onCellKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (locked) return;
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      if (cells[index]) {
        e.preventDefault();
        setLetterAt(index, "", false);
        return;
      }
      e.preventDefault();
      const entry = entryForCellPrefer(puzzle, index, direction);
      const dir = entry?.dir ?? direction;
      const prev = nextCellInDirection(puzzle, index, dir, -1);
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
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setDirection("across");
      const n = nextCellInDirection(puzzle, index, "across", 1);
      if (n != null) focusCell(n, "across");
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDirection("across");
      const n = nextCellInDirection(puzzle, index, "across", -1);
      if (n != null) focusCell(n, "across");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDirection("down");
      const n = nextCellInDirection(puzzle, index, "down", 1);
      if (n != null) focusCell(n, "down");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setDirection("down");
      const n = nextCellInDirection(puzzle, index, "down", -1);
      if (n != null) focusCell(n, "down");
    }
  }

  const statusLine = solved
    ? "Solved"
    : revealed
      ? "Answers revealed"
      : started
        ? "Tap a square, then type"
        : "One mini puzzle a day — shapes change";

  const clearLabel = "Clear";

  return (
    <section className="home-card home-card-crossword" aria-label="Daily crossword">
      <div className="home-card-head">
        <p className="home-card-kicker">Daily crossword</p>
        <h2>Today&apos;s puzzle</h2>
        <p className="tiny home-card-sub">{statusLine}</p>
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
          <div className="crossword-board">
            {!locked ? (
              <div className="crossword-toolbar">
                <button
                  type="button"
                  className="btn ghost crossword-clear"
                  disabled={!canClear || busy}
                  onClick={onClearActive}
                  aria-label={clearLabel}
                >
                  {clearLabel}
                </button>
              </div>
            ) : null}

            <div
              className={`crossword-grid${locked ? " locked" : ""}${solved ? " solved" : ""}${revealed ? " revealed" : ""}`}
              role="grid"
              aria-label="Crossword grid"
              aria-readonly={locked || undefined}
            >
              {grid.map((cell) => (
                <GridCell
                  key={cell.index}
                  cell={cell}
                  value={cells[cell.index] || ""}
                  selected={selected === cell.index}
                  inActiveWord={activeIndexes.has(cell.index)}
                  locked={locked}
                  correct={correctCells.has(cell.index)}
                  inputRef={(el) => {
                    if (el) cellRefs.current.set(cell.index, el);
                    else cellRefs.current.delete(cell.index);
                  }}
                  onPointerDown={() => onCellPointerDown(cell.index)}
                  onFocus={() => setSelected(cell.index)}
                  onChange={(e) => onCellChange(cell.index, e)}
                  onKeyDown={(e) => onCellKeyDown(cell.index, e)}
                />
              ))}
            </div>
          </div>

          <div className="crossword-clues">
            <div>
              <p className="crossword-clue-head">Across</p>
              <ul>
                {puzzle.across.map((c) => {
                  const active =
                    activeEntry?.dir === "across" && activeEntry.num === c.num;
                  const ok = isWordCorrect(puzzle, cells, c.num, "across");
                  return (
                    <li key={`a-${c.num}`}>
                      <button
                        type="button"
                        className={`crossword-clue-btn${active ? " active" : ""}${ok ? " correct" : ""}`}
                        disabled={locked}
                        onClick={() => selectClue(c.num, "across")}
                      >
                        <strong>{c.num}.</strong> {c.clue}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="crossword-clue-head">Down</p>
              <ul>
                {puzzle.down.map((c) => {
                  const active =
                    activeEntry?.dir === "down" && activeEntry.num === c.num;
                  const ok = isWordCorrect(puzzle, cells, c.num, "down");
                  return (
                    <li key={`d-${c.num}`}>
                      <button
                        type="button"
                        className={`crossword-clue-btn${active ? " active" : ""}${ok ? " correct" : ""}`}
                        disabled={locked}
                        onClick={() => selectClue(c.num, "down")}
                      >
                        <strong>{c.num}.</strong> {c.clue}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {!locked ? (
            <button
              type="button"
              className="btn ghost crossword-solve"
              disabled={busy}
              onClick={() => void onReveal()}
            >
              {busy ? "Solving…" : "Solve"}
            </button>
          ) : null}
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
  inActiveWord,
  locked,
  correct,
  inputRef,
  onPointerDown,
  onFocus,
  onChange,
  onKeyDown,
}: {
  cell: CrosswordCell;
  value: string;
  selected: boolean;
  inActiveWord: boolean;
  locked: boolean;
  correct: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onPointerDown: () => void;
  onFocus: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  if (cell.black) {
    return <div className="crossword-cell black" aria-hidden />;
  }
  return (
    <div
      className={`crossword-cell${selected && !locked ? " selected" : ""}${inActiveWord && !selected && !locked ? " in-word" : ""}${locked ? " done" : ""}${correct ? " correct" : ""}`}
      onPointerDown={onPointerDown}
    >
      {cell.number != null ? (
        <span className="crossword-num">{cell.number}</span>
      ) : null}
      {correct && !locked ? (
        <span className="crossword-correct-mark" aria-hidden>
          ✓
        </span>
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
        disabled={locked}
        aria-label={
          cell.number
            ? `Cell ${cell.number}${value ? `, ${value}` : ""}${correct ? ", correct" : ""}`
            : value || "Empty cell"
        }
        onFocus={onFocus}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
