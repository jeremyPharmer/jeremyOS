"use client";

import Link from "next/link";
import {
  featuredThemes,
  rethinkThemes,
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
  "signal-ink": {
    bg: "#f4f6f8",
    accent: "#00b3c7",
    accent2: "#1ac4d6",
    good: "#12a37a",
    text: "#0b1220",
  },
  "chartreuse-cut": {
    bg: "#f7f5ef",
    accent: "#c6e000",
    accent2: "#d4ee3a",
    good: "#3d9a5c",
    text: "#141414",
  },
  "nordic-cobalt": {
    bg: "#eef1f4",
    accent: "#1e3a8a",
    accent2: "#2563eb",
    good: "#0d9488",
    text: "#1e293b",
  },
  "olive-archive": {
    bg: "#f3f0e7",
    accent: "#4a5240",
    accent2: "#6b7460",
    good: "#5a8a62",
    text: "#1f1f1c",
  },
  "slate-coral": {
    bg: "#e9eef2",
    accent: "#ff6b5a",
    accent2: "#ff8576",
    good: "#2f9e7a",
    text: "#1e293b",
  },
  "mint-ledger": {
    bg: "#111418",
    accent: "#3dd6c6",
    accent2: "#5ee0d2",
    good: "#4ade80",
    text: "#e8eef4",
  },
  "sandstone-studio": {
    bg: "#ebe4d8",
    accent: "#0f766e",
    accent2: "#14b8a6",
    good: "#2f8f6a",
    text: "#1c1c1c",
  },
  "midnight-signal": {
    bg: "#070b14",
    accent: "#b8f000",
    accent2: "#c8f83a",
    good: "#5ee0a0",
    text: "#e8eef8",
  },
  "porcelain-pine": {
    bg: "#fafafa",
    accent: "#1b4332",
    accent2: "#2d6a4f",
    good: "#40916c",
    text: "#1b4332",
  },
  "copper-fog": {
    bg: "#e8eaed",
    accent: "#b87333",
    accent2: "#c98a4a",
    good: "#4a9a78",
    text: "#2a2e35",
  },
  "mets-classic": {
    bg: "#e8eef8",
    accent: "#002d72",
    accent2: "#ff5910",
    good: "#c5e063",
    text: "#002d72",
  },
  "zion-peak": {
    bg: "#f7f9fc",
    accent: "#f0c43a",
    accent2: "#f5d266",
    good: "#5a9e8a",
    text: "#1a2744",
  },
  "briefing-desk": {
    bg: "#e6e8ee",
    accent: "#3b6fd4",
    accent2: "#5b8ae0",
    good: "#3d9a78",
    text: "#1c2430",
  },
  "shea-night": {
    bg: "#0a1220",
    accent: "#ff5910",
    accent2: "#ff7a3d",
    good: "#c5e063",
    text: "#e8eef8",
  },
  "pitch-side": {
    bg: "#eaf3eb",
    accent: "#1f6b45",
    accent2: "#3d8f62",
    good: "#2f8f5c",
    text: "#163828",
  },
  "iron-hour": {
    bg: "#121418",
    accent: "#c47a4a",
    accent2: "#d49266",
    good: "#7fbf9a",
    text: "#ebe6df",
  },
  "five-year-paper": {
    bg: "#f3eee3",
    accent: "#4a6fa5",
    accent2: "#6a8cbc",
    good: "#6a9e7b",
    text: "#2a2926",
  },
  "treat-ledger": {
    bg: "#0c1814",
    accent: "#c9a227",
    accent2: "#dbb84a",
    good: "#5fbf9a",
    text: "#e8f4ec",
  },
  "dawn-ritual": {
    bg: "#fff1e4",
    accent: "#e08a4a",
    accent2: "#6a9bb8",
    good: "#6a9e7b",
    text: "#3a2a1e",
  },
  "wind-down": {
    bg: "#161a24",
    accent: "#d4a06a",
    accent2: "#e0b488",
    good: "#7a9e9a",
    text: "#e8e4dc",
  },
  "kitchen-herb": {
    bg: "#f0ebe2",
    accent: "#4f7a52",
    accent2: "#c4a574",
    good: "#4f7a52",
    text: "#2e2a22",
  },
  "locker-chalk": {
    bg: "#e2eeec",
    accent: "#1f6f6a",
    accent2: "#3d9490",
    good: "#2f8f7a",
    text: "#1a3331",
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
            <span className="palette-index">{String(index + 1).padStart(2, "0")}</span>
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

export default function ThemesPage() {
  const { theme, setTheme } = useTheme();
  const rethink = rethinkThemes();
  const current = featuredThemes();

  return (
    <main className="page themes-board">
      <header className="themes-board-header">
        <p className="eyebrow">Modern rethink · mobile board</p>
        <h1>Color palettes</h1>
        <p className="muted">
          Ten fresh directions — tap any card to restyle the whole OS live.
          Scroll the current favorites below if you want to compare.
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

      <section className="themes-board-section">
        <h2>Rethink options</h2>
        <p className="muted themes-board-core">
          Wide variety on purpose: product cyan, acid editorial, nordic cobalt,
          olive quiet, coral slate, mint night, sandstone teal, midnight lime,
          porcelain pine, copper fog.
        </p>
        <div className="palette-grid">
          {rethink.map((option, index) => (
            <PaletteCard
              key={option.id}
              id={option.id}
              label={option.label}
              description={option.description}
              layoutHint={option.layoutHint}
              layout={option.layout}
              selected={theme === option.id}
              onSelect={() => setTheme(option.id)}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="themes-board-section">
        <h2>Current board</h2>
        <p className="muted themes-board-core">
          Mets / Zion, briefing, training, journal, fund, morning/evening —
          still here for side-by-side.
        </p>
        <div className="palette-grid">
          {current.map((option) => (
            <PaletteCard
              key={option.id}
              id={option.id}
              label={option.label}
              description={option.description}
              layoutHint={option.layoutHint}
              layout={option.layout}
              selected={theme === option.id}
              onSelect={() => setTheme(option.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
