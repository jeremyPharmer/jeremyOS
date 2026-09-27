"use client";

import Link from "next/link";
import { earthThemes, THEMES, type ThemeId } from "@/lib/themes";
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
  "bone-graphite": {
    bg: "#f3f0ea",
    accent: "#3a3a38",
    accent2: "#5c5a56",
    good: "#6a7d68",
    text: "#3a3a38",
  },
  "river-stone": {
    bg: "#eceee9",
    accent: "#5c6560",
    accent2: "#7a8480",
    good: "#5f7d6a",
    text: "#3d4540",
  },
  "wheat-umber": {
    bg: "#f2eadc",
    accent: "#6b4f3a",
    accent2: "#8a6a4e",
    good: "#6a7d58",
    text: "#3a2e24",
  },
  "moss-linen": {
    bg: "#f1eee6",
    accent: "#5e6b55",
    accent2: "#7a8770",
    good: "#5a7a5e",
    text: "#2e322c",
  },
  "taupe-ink": {
    bg: "#ebe6df",
    accent: "#2c2926",
    accent2: "#5a524c",
    good: "#6a7a62",
    text: "#2c2926",
  },
  "charcoal-oak": {
    bg: "#1a1c1b",
    accent: "#c4a574",
    accent2: "#d4b888",
    good: "#7a9a78",
    text: "#e8e4dc",
  },
  "espresso-night": {
    bg: "#14110f",
    accent: "#d8cfc3",
    accent2: "#e4dcd2",
    good: "#8a9e7a",
    text: "#e8e0d6",
  },
  "slate-umber": {
    bg: "#171a1c",
    accent: "#a67c52",
    accent2: "#b89068",
    good: "#6a9a80",
    text: "#e4e8ec",
  },
  "forest-dusk": {
    bg: "#121614",
    accent: "#c5b896",
    accent2: "#d4c8a8",
    good: "#7a9e7a",
    text: "#e4e0d4",
  },
  "ink-sienna": {
    bg: "#101010",
    accent: "#b07a55",
    accent2: "#c4906a",
    good: "#7a9a78",
    text: "#e8e4e0",
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
  options: ReturnType<typeof earthThemes>;
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
  const earth = earthThemes();
  const earthLight = earth.slice(0, 5);
  const earthDark = earth.slice(5);

  return (
    <main className="page themes-board">
      <header className="themes-board-header">
        <p className="eyebrow">Appearance</p>
        <h1>Color palettes</h1>
        <p className="muted">
          Ten earth &amp; neutral directions — five light, five dark. Tap to
          restyle live. Same set as Settings → Appearance.
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
        title="Light"
        blurb="Bone, stone, wheat, moss, taupe — soft day grounds."
        options={earthLight}
        theme={theme}
        setTheme={setTheme}
      />

      <PaletteSection
        title="Dark"
        blurb="Charcoal, espresso, slate, forest, ink — dark grounds, quiet heat."
        options={earthDark}
        theme={theme}
        setTheme={setTheme}
        startIndex={5}
      />
    </main>
  );
}
