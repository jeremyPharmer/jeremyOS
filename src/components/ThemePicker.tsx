"use client";

import Link from "next/link";
import { rethinkThemes, featuredThemes, type ThemeId } from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const rethink = rethinkThemes();
  const current = featuredThemes();

  return (
    <section className="panel theme-picker">
      <p className="eyebrow">Appearance</p>
      <p className="muted" style={{ marginTop: 0, lineHeight: 1.45 }}>
        Modern rethink palettes + your current board.{" "}
        <Link href="/themes" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Full palette board
        </Link>
      </p>

      <p className="theme-picker-group-label">Rethink</p>
      <div className="theme-picker-grid">
        {rethink.map((option) => {
          const selected = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={
                selected ? "theme-card theme-card-selected" : "theme-card"
              }
              aria-pressed={selected}
              onClick={() => setTheme(option.id as ThemeId)}
            >
              <span className="theme-card-swatches" aria-hidden>
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="theme-card-swatch"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="theme-card-copy">
                <span className="theme-card-label">{option.label}</span>
                <span className="theme-card-desc">{option.description}</span>
              </span>
              {selected ? (
                <span className="theme-card-badge">Active</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="theme-picker-group-label">Current</p>
      <div className="theme-picker-grid">
        {current.map((option) => {
          const selected = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={
                selected ? "theme-card theme-card-selected" : "theme-card"
              }
              aria-pressed={selected}
              onClick={() => setTheme(option.id as ThemeId)}
            >
              <span className="theme-card-swatches" aria-hidden>
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="theme-card-swatch"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="theme-card-copy">
                <span className="theme-card-label">{option.label}</span>
                <span className="theme-card-desc">{option.description}</span>
              </span>
              {selected ? (
                <span className="theme-card-badge">Active</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
