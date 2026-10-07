"use client";

import Link from "next/link";
import {
  featuredDarkThemes,
  featuredLightThemes,
  THEMES,
  type ThemeId,
} from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

type RoleKey = "bg" | "accent" | "accent2" | "good" | "text";

const PALETTE_ROLES: { key: RoleKey; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "accent", label: "Accent" },
  { key: "accent2", label: "Accent 2" },
  { key: "good", label: "Good" },
  { key: "text", label: "Text" },
];

const ROLE_COLORS: Partial<Record<ThemeId, Record<RoleKey, string>>> = {
  "wheat-umber": {
    bg: "#f2eadc",
    accent: "#6b4f3a",
    accent2: "#8a6a4e",
    good: "#6a7d58",
    text: "#3a2e24",
  },
  "navy-crest": {
    bg: "#eef1f6",
    accent: "#0b1f4a",
    accent2: "#c9a227",
    good: "#3d8f6e",
    text: "#0b1f4a",
  },
  "retro-arcade": {
    bg: "#f7f1e3",
    accent: "#0d7377",
    accent2: "#e0a100",
    good: "#4a8f5c",
    text: "#1f2a24",
  },
  "citrus-press": {
    bg: "#fff8e7",
    accent: "#2a2a28",
    accent2: "#e6b422",
    good: "#5a9a62",
    text: "#2a2a28",
  },
  "glacier-mint": {
    bg: "#f3faf8",
    accent: "#1f6f66",
    accent2: "#7ec8b8",
    good: "#2f9e7a",
    text: "#163832",
  },
  "brick-folio": {
    bg: "#f7f0e8",
    accent: "#9a3b2e",
    accent2: "#c45a4a",
    good: "#5a8a62",
    text: "#2c2420",
  },
  "ink-stripe": {
    bg: "#fafafa",
    accent: "#111111",
    accent2: "#5a5a5a",
    good: "#2f8f5c",
    text: "#111111",
  },
  "void-amber": {
    bg: "#0e0e10",
    accent: "#e0a040",
    accent2: "#f0b860",
    good: "#5ee0a0",
    text: "#ececf0",
  },
  "deep-harbor": {
    bg: "#07101f",
    accent: "#d4b45a",
    accent2: "#e4c878",
    good: "#5fbf9a",
    text: "#e6eef8",
  },
  "graphite-bloom": {
    bg: "#151618",
    accent: "#c97b84",
    accent2: "#d9949c",
    good: "#7a9e8a",
    text: "#ece8ea",
  },
};

function rolesFor(id: ThemeId): Record<RoleKey, string> {
  const known = ROLE_COLORS[id];
  if (known) return known;
  const theme = THEMES.find((t) => t.id === id);
  const [bg, accent, accent2] = theme?.swatches ?? ["#eee", "#333", "#666"];
  return { bg, accent, accent2, good: accent2, text: accent };
}

function contrastText(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.55 ? "#111" : "#fff";
}

function LivePreview() {
  return (
    <div className="palette-live-preview" aria-hidden>
      <p className="eyebrow">Live preview</p>
      <h2 className="palette-live-title">Saturday</h2>
      <p className="muted palette-live-sub">Morning open · 3 todos left</p>
      <div className="palette-live-row">
        <span className="palette-live-chip good">Done</span>
        <span className="palette-live-chip">Plan</span>
        <span className="palette-live-chip warn">Move</span>
      </div>
      <button type="button" className="btn primary palette-live-cta">
        Apply vibe
      </button>
    </div>
  );
}

function PaletteCard({
  id,
  label,
  description,
  layoutHint,
  layout,
  selected,
  onSelect,
  index,
}: {
  id: ThemeId;
  label: string;
  description: string;
  layoutHint: string;
  layout: string;
  selected: boolean;
  onSelect: () => void;
  index?: number;
}) {
  const roles = rolesFor(id);
  return (
    <button
      type="button"
      className={selected ? "palette-card palette-card-active" : "palette-card"}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="palette-card-head">
        <div>
          {typeof index === "number" ? (
            <span className="palette-index">
              {String(index + 1).padStart(2, "0")}
            </span>
          ) : null}
          <strong>{label}</strong>
          <p>{description}</p>
          <p className="palette-layout-hint">
            <span className="palette-layout-tag">{layout}</span>
            {layoutHint}
          </p>
        </div>
        {selected ? <span className="palette-badge">Active</span> : null}
      </div>
      <div className="palette-strips">
        {PALETTE_ROLES.map(({ key, label: roleLabel }) => {
          const color = roles[key];
          return (
            <div
              key={key}
              className="palette-strip"
              style={{ background: color, color: contrastText(color) }}
            >
              <span>{roleLabel}</span>
              <code>{color}</code>
            </div>
          );
        })}
      </div>
    </button>
  );
}

function PaletteSection({
  title,
  blurb,
  options,
  theme,
  setTheme,
  startIndex = 0,
}: {
  title: string;
  blurb: string;
  options: ReturnType<typeof featuredLightThemes>;
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  startIndex?: number;
}) {
  return (
    <section className="themes-board-section">
      <h2>{title}</h2>
      <p className="muted themes-board-core">{blurb}</p>
      <div className="palette-grid">
        {options.map((option, index) => (
          <PaletteCard
            key={option.id}
            id={option.id}
            label={option.label}
            description={option.description}
            layoutHint={option.layoutHint}
            layout={option.layout}
            selected={theme === option.id}
            onSelect={() => setTheme(option.id)}
            index={startIndex + index}
          />
        ))}
      </div>
    </section>
  );
}

export default function ThemesPage() {
  const { theme, setTheme } = useTheme();
  const light = featuredLightThemes();
  const dark = featuredDarkThemes();

  return (
    <main className="page themes-board">
      <header className="themes-board-header">
        <p className="eyebrow">Appearance · review board</p>
        <h1>Color palettes</h1>
        <p className="muted">
          Wheat Umber stays. Nine new options — navy/gold, retro, citrus, mint,
          brick, ink, plus three darks. Tap to restyle live.
        </p>
        <div className="themes-board-links">
          <Link href="/" className="themes-board-link">
            ← Try on Home
          </Link>
          <Link href="/settings" className="themes-board-link">
            Settings
          </Link>
        </div>
      </header>

      <LivePreview />

      <PaletteSection
        title="Light & varied"
        blurb="Wheat kept, then navy crest, retro, citrus, glacier, brick, ink."
        options={light}
        theme={theme}
        setTheme={setTheme}
      />

      <PaletteSection
        title="Dark"
        blurb="Void amber, deep harbor, graphite bloom."
        options={dark}
        theme={theme}
        setTheme={setTheme}
        startIndex={7}
      />
    </main>
  );
}
