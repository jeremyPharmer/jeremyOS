"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ScaleInput({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const display =
    step < 1 && !Number.isInteger(value) ? value.toFixed(1) : String(value);
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <strong>{display}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Discrete 1–10 (or custom) tap line — morning check-in (RB-027). */
export function TapScale({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  label: string;
  /** null = nothing chosen yet (no preselect). */
  value: number | null;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const ticks: number[] = [];
  for (let n = min; n <= max; n += 1) ticks.push(n);
  return (
    <div className="field tap-scale">
      <div className="field-label">
        <span>{label}</span>
      </div>
      <div
        className="tap-scale-line"
        role="radiogroup"
        aria-label={label}
      >
        {ticks.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`tap-scale-tick${selected ? " selected" : ""}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Money({ value }: { value: number }) {
  return (
    <span className="money">
      ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="btn primary"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="btn secondary"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ done, target }: { done: number; target: number }) {
  const pct = target === 0 ? 0 : Math.min(100, (done / target) * 100);
  return (
    <div className="progress-track" aria-hidden>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({
  label,
  busy,
  onClose,
  children,
}: {
  label: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    html.classList.add("sheet-open");
    // Lock scroll without position:fixed — that breaks iOS fixed children.
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Focus the dialog chrome (not an input) so iOS doesn't open the keyboard.
    const sheetEl = sheetRef.current;
    const backdropEl = backdropRef.current;
    sheetEl?.focus({ preventScroll: true });

    /**
     * Keep the sheet above the soft keyboard.
     * Shrinking only max-height pins the sheet to the layout bottom and hides
     * the form under the keyboard — lift with padding-bottom instead.
     */
    const syncToVisualViewport = () => {
      const vv = window.visualViewport;
      const layoutH = window.innerHeight || 0;
      const visibleH = vv?.height ?? layoutH;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, Math.round(layoutH - visibleH - offsetTop));
      const max = Math.round(
        Math.max(220, Math.min(visibleH * 0.92, 720)),
      );
      backdropEl?.style.setProperty("padding-bottom", `${keyboardInset}px`);
      sheetEl?.style.setProperty("max-height", `${max}px`);
    };
    syncToVisualViewport();
    window.visualViewport?.addEventListener("resize", syncToVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncToVisualViewport);
    window.addEventListener("resize", syncToVisualViewport);

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      // After keyboard animates, keep the focused field in the scrollport.
      window.setTimeout(() => {
        syncToVisualViewport();
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
    };
    sheetEl?.addEventListener("focusin", onFocusIn);

    return () => {
      html.classList.remove("sheet-open");
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.visualViewport?.removeEventListener("resize", syncToVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncToVisualViewport);
      window.removeEventListener("resize", syncToVisualViewport);
      sheetEl?.removeEventListener("focusin", onFocusIn);
      window.scrollTo(0, scrollY);
    };
  }, [ready]);

  function endDrag(clientY: number) {
    if (dragStartY.current == null) return;
    const delta = clientY - dragStartY.current;
    dragStartY.current = null;
    setDragOffset(0);
    if (!busy && delta > 80) onClose();
  }

  if (!ready) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        ref={sheetRef}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={
          dragOffset > 0
            ? { transform: `translateY(${dragOffset}px)` }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-sheet-chrome"
          onTouchStart={(e) => {
            dragStartY.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(e) => {
            if (dragStartY.current == null) return;
            const y = e.touches[0]?.clientY ?? dragStartY.current;
            setDragOffset(Math.max(0, y - dragStartY.current));
          }}
          onTouchEnd={(e) => {
            endDrag(e.changedTouches[0]?.clientY ?? 0);
          }}
          onTouchCancel={() => {
            dragStartY.current = null;
            setDragOffset(0);
          }}
        >
          <div className="modal-sheet-handle" aria-hidden />
        </div>
        <div className="modal-sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function useToggleSet<T extends string>(initial: T[] = []) {
  const [set, setSet] = useState<Set<T>>(new Set(initial));
  const toggle = (v: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };
  return { set, toggle, values: [...set] };
}
