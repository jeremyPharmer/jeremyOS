"use client";

import Link from "next/link";
import {
  earthThemes,
  modernThemes,
  type ThemeId,
} from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

function ThemeGrid({
  options,
  theme,
  setTheme,
}: {
  options: ReturnType<typeof modernThemes>;
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}) {
  return (
    <div className="theme-picker-grid">
      {options.map((option) => {
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
            {selected ? <span className="theme-card-badge">Active</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const modern = modernThemes();
  const earth = earthThemes();
  const earthLight = earth.slice(0, 5);
  const earthDark = earth.slice(5);

  return (
    <section className="panel theme-picker">
      <p className="eyebrow">Appearance</p>
      <p className="muted" style={{ marginTop: 0, lineHeight: 1.45 }}>
        Modern accents + earth / dark neutrals.{" "}
        <Link href="/themes" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Palette board
        </Link>
      </p>

      <p className="theme-picker-group-label">Modern</p>
      <ThemeGrid options={modern} theme={theme} setTheme={setTheme} />

      <p className="theme-picker-group-label">Earth · light</p>
      <ThemeGrid options={earthLight} theme={theme} setTheme={setTheme} />

      <p className="theme-picker-group-label">Earth · dark</p>
      <ThemeGrid options={earthDark} theme={theme} setTheme={setTheme} />
    </section>
  );
}
