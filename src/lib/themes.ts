export const THEME_STORAGE_KEY = "jeremyos-theme";

/** Soft layout personality applied via `data-layout` on `<html>`. */
export type LayoutId =
  | "briefing"
  | "paper"
  | "athletic"
  | "ritual"
  | "ledger"
  | "studio"
  | "stadium"
  | "cozy";

export type ThemeId =
  | "forest"
  | "morning-mist"
  | "sage-clay"
  | "ember-glow"
  | "ocean-glass"
  | "terracotta-dawn"
  | "forest-bath"
  | "periwinkle-pause"
  | "sunlit-grove"
  | "twilight-teal"
  | "paper-ink"
  | "coral-bloom"
  | "harbor-blue"
  | "honey-wheat"
  | "lilac-haze"
  | "rose-clay"
  | "seafoam"
  | "butter-lemon"
  | "plum-mist"
  | "cedar-cream"
  | "jade-mist"
  | "zion-peak"
  | "mets-classic"
  | "briefing-desk"
  | "shea-night"
  | "pitch-side"
  | "iron-hour"
  | "five-year-paper"
  | "treat-ledger"
  | "dawn-ritual"
  | "wind-down"
  | "kitchen-herb"
  | "locker-chalk"
  | "signal-ink"
  | "chartreuse-cut"
  | "nordic-cobalt"
  | "olive-archive"
  | "slate-coral"
  | "mint-ledger"
  | "sandstone-studio"
  | "midnight-signal"
  | "porcelain-pine"
  | "copper-fog";

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
  /** One-line layout + content intent for the palette board. */
  layoutHint: string;
  layout: LayoutId;
  swatches: [string, string, string];
  /** When true, shown on Settings picker + palette board. */
  featured?: boolean;
};

/** Default theme when nothing is stored. */
export const DEFAULT_THEME_ID: ThemeId = "signal-ink";

/** Themes shown in Settings + palette board (the active 10). */
export const FEATURED_THEME_IDS: ThemeId[] = [
  "signal-ink",
  "chartreuse-cut",
  "nordic-cobalt",
  "olive-archive",
  "slate-coral",
  "mint-ledger",
  "sandstone-studio",
  "midnight-signal",
  "porcelain-pine",
  "copper-fog",
];

/** @deprecated Use FEATURED_THEME_IDS — kept as an alias for older imports. */
export const RETHINK_THEME_IDS: ThemeId[] = FEATURED_THEME_IDS;

export const THEMES: ThemeOption[] = [
  // ── Modern rethink (2026) ──
  {
    id: "signal-ink",
    label: "Signal Ink",
    description: "Porcelain + ink + electric cyan",
    layoutHint: "Product OS — crisp chrome, todos read as signals.",
    layout: "briefing",
    swatches: ["#f4f6f8", "#0b1220", "#00b3c7"],
    featured: true,
  },
  {
    id: "chartreuse-cut",
    label: "Chartreuse Cut",
    description: "Bone white with acid green cut",
    layoutHint: "Editorial edge — headlines bite, actions glow.",
    layout: "studio",
    swatches: ["#f7f5ef", "#141414", "#c6e000"],
    featured: true,
  },
  {
    id: "nordic-cobalt",
    label: "Nordic Cobalt",
    description: "Cool stone with deep cobalt",
    layoutHint: "Scandi calm — clean stack, focus without noise.",
    layout: "briefing",
    swatches: ["#eef1f4", "#1e3a8a", "#64748b"],
    featured: true,
  },
  {
    id: "olive-archive",
    label: "Olive Archive",
    description: "Warm olive with bone + charcoal",
    layoutHint: "Quiet utility — grounded day, soft surfaces.",
    layout: "cozy",
    swatches: ["#f3f0e7", "#4a5240", "#1f1f1c"],
    featured: true,
  },
  {
    id: "slate-coral",
    label: "Slate Coral",
    description: "Cool slate with coral signal",
    layoutHint: "Modern sports desk — energy without game-day orange.",
    layout: "athletic",
    swatches: ["#e9eef2", "#ff6b5a", "#334155"],
    featured: true,
  },
  {
    id: "mint-ledger",
    label: "Mint Ledger",
    description: "Soft black with mint + silver",
    layoutHint: "Fintech night — Money + progress feel precise.",
    layout: "ledger",
    swatches: ["#111418", "#3dd6c6", "#9aa3ad"],
    featured: true,
  },
  {
    id: "sandstone-studio",
    label: "Sandstone Studio",
    description: "Warm sand with graphite + teal",
    layoutHint: "Architectural day — airy panels, teal for action.",
    layout: "studio",
    swatches: ["#ebe4d8", "#1c1c1c", "#0f766e"],
    featured: true,
  },
  {
    id: "midnight-signal",
    label: "Midnight Signal",
    description: "Blue-black with lime signal",
    layoutHint: "After-hours OS — low glare, status pops lime.",
    layout: "ritual",
    swatches: ["#070b14", "#b8f000", "#7eb6ff"],
    featured: true,
  },
  {
    id: "porcelain-pine",
    label: "Porcelain Pine",
    description: "Gallery white with deep pine",
    layoutHint: "Gallery calm — spa-clean surfaces, pine accents.",
    layout: "paper",
    swatches: ["#fafafa", "#1b4332", "#95d5b2"],
    featured: true,
  },
  {
    id: "copper-fog",
    label: "Copper Fog",
    description: "Cool fog with copper wire",
    layoutHint: "Industrial soft — fog gray day, copper heat.",
    layout: "cozy",
    swatches: ["#e8eaed", "#b87333", "#2a2e35"],
    featured: true,
  },
  {
    id: "mets-classic",
    label: "Mets Classic",
    description: "Royal blue + orange + lime",
    layoutHint: "Stadium energy — Home reads like a game-day briefing.",
    layout: "stadium",
    swatches: ["#e8eef8", "#002d72", "#ff5910"],
  },
  {
    id: "zion-peak",
    label: "Zion Peak",
    description: "White + sunny yellow, navy lettering",
    layoutHint: "Open-sky day — airy gaps, adventure-forward chrome.",
    layout: "stadium",
    swatches: ["#f7f9fc", "#f0c43a", "#1a2744"],
  },
  {
    id: "briefing-desk",
    label: "Briefing Desk",
    description: "Charcoal slate + cobalt focus",
    layoutHint: "EA command center — tight stack, todos & plan first.",
    layout: "briefing",
    swatches: ["#eceef2", "#1c2430", "#3b6fd4"],
  },
  {
    id: "shea-night",
    label: "Shea Night",
    description: "Night navy with orange dugout glow",
    layoutHint: "After-dark Mets — Journey & evening check-in feel lit.",
    layout: "stadium",
    swatches: ["#0c1424", "#ff5910", "#7eb6ff"],
  },
  {
    id: "pitch-side",
    label: "Pitch Side",
    description: "Pitch green with chalk white lines",
    layoutHint: "Match-day calm — Move hub + week plan front and center.",
    layout: "athletic",
    swatches: ["#eef5ef", "#1f6b45", "#c8d9c4"],
  },
  {
    id: "iron-hour",
    label: "Iron Hour",
    description: "Graphite gym with copper heat",
    layoutHint: "Training board — compact cards, workout PRs pop.",
    layout: "athletic",
    swatches: ["#16181c", "#c47a4a", "#9aa3ad"],
  },
  {
    id: "five-year-paper",
    label: "Five-Year Paper",
    description: "Ivory page with ink + margin blue",
    layoutHint: "Journal paper — soft radius, headline-first reading.",
    layout: "paper",
    swatches: ["#f7f3ea", "#2a2926", "#4a6fa5"],
  },
  {
    id: "treat-ledger",
    label: "Treat Ledger",
    description: "Deep emerald with soft gold",
    layoutHint: "Money honesty — Future vs Treat Yourself at a glance.",
    layout: "ledger",
    swatches: ["#0f1f1a", "#c9a227", "#5fbf9a"],
  },
  {
    id: "dawn-ritual",
    label: "Dawn Ritual",
    description: "Apricot sky with soft lake blue",
    layoutHint: "Morning start — mood ritual as the hero, gentle pace.",
    layout: "ritual",
    swatches: ["#fff4ea", "#e08a4a", "#6a9bb8"],
  },
  {
    id: "wind-down",
    label: "Wind-Down",
    description: "Dusk slate with warm lamp amber",
    layoutHint: "Evening close — low glare, journal + feelings elevated.",
    layout: "ritual",
    swatches: ["#1a1e28", "#d4a06a", "#8a96a8"],
  },
  {
    id: "kitchen-herb",
    label: "Kitchen Herb",
    description: "Warm stone with basil green",
    layoutHint: "Recipe studio — softer panels, food & week plan friendly.",
    layout: "studio",
    swatches: ["#f4efe6", "#4f7a52", "#c4a574"],
  },
  {
    id: "locker-chalk",
    label: "Locker Chalk",
    description: "Teal locker room with chalk dust",
    layoutHint: "Athletic OS — Move + entertainment as twin pillars.",
    layout: "athletic",
    swatches: ["#e8f2f1", "#1f6f6a", "#dfe9e7"],
  },
  // ── Archive (still selectable if already saved) ──
  {
    id: "coral-bloom",
    label: "Coral Bloom",
    description: "Warm coral on soft blush cream",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#fff5f1", "#e07a5f", "#f2a391"],
  },
  {
    id: "harbor-blue",
    label: "Harbor Blue",
    description: "Calm denim blue on cool mist",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#f3f7fb", "#4a7ab5", "#7aa3d4"],
  },
  {
    id: "honey-wheat",
    label: "Honey Wheat",
    description: "Golden honey on warm wheat",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#fbf6eb", "#c9922e", "#dfb45a"],
  },
  {
    id: "lilac-haze",
    label: "Lilac Haze",
    description: "Soft lilac on pale lavender",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#f6f3fa", "#8f7bb8", "#b3a3d4"],
  },
  {
    id: "rose-clay",
    label: "Rose Clay",
    description: "Dusty rose on powder blush",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#fbf4f6", "#c47a8a", "#d9a0ab"],
  },
  {
    id: "seafoam",
    label: "Seafoam",
    description: "Fresh teal on mint ice",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#f1faf7", "#3d9b8f", "#6dbfb3"],
  },
  {
    id: "butter-lemon",
    label: "Butter Lemon",
    description: "Soft lemon with warm cocoa text",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#fffbed", "#d4b43a", "#e6c96a"],
  },
  {
    id: "plum-mist",
    label: "Plum Mist",
    description: "Muted plum on cool gray-lilac",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#f5f3f7", "#8a6b8f", "#b091b5"],
  },
  {
    id: "cedar-cream",
    label: "Cedar Cream",
    description: "Warm cedar rust on cream",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#faf6f0", "#b86b45", "#d4926e"],
  },
  {
    id: "jade-mist",
    label: "Jade Mist",
    description: "Soft jade on pale celadon",
    layoutHint: "Soft pastel archive.",
    layout: "cozy",
    swatches: ["#f3f8f4", "#4f9a78", "#7aba98"],
  },
  {
    id: "forest",
    label: "Forest",
    description: "Current dark green + terracotta",
    layoutHint: "Legacy dark.",
    layout: "cozy",
    swatches: ["#0f1c18", "#d4844a", "#7fbf9a"],
  },
  {
    id: "morning-mist",
    label: "Morning Mist",
    description: "Soft sky blue, calm and light",
    layoutHint: "Legacy soft.",
    layout: "ritual",
    swatches: ["#eef4f8", "#6b9bd1", "#8bb8a8"],
  },
  {
    id: "sage-clay",
    label: "Sage & Clay",
    description: "Earthy cream with green + peach",
    layoutHint: "Legacy soft.",
    layout: "cozy",
    swatches: ["#f4f1ec", "#7a9e87", "#d4956a"],
  },
  {
    id: "ember-glow",
    label: "Ember Glow",
    description: "Soft navy with warm amber",
    layoutHint: "Legacy dark.",
    layout: "ritual",
    swatches: ["#1a2433", "#e8a574", "#6bb5c4"],
  },
  {
    id: "ocean-glass",
    label: "Ocean Glass",
    description: "Frosted aqua, coastal and airy",
    layoutHint: "Legacy soft.",
    layout: "cozy",
    swatches: ["#f0f7fa", "#4a9bb5", "#7ec4b8"],
  },
  {
    id: "terracotta-dawn",
    label: "Terracotta Dawn",
    description: "Warm cream with peach orange",
    layoutHint: "Legacy soft.",
    layout: "cozy",
    swatches: ["#fbf6f1", "#e0986a", "#c4a882"],
  },
  {
    id: "forest-bath",
    label: "Forest Bath",
    description: "Soft mint green, grounded",
    layoutHint: "Legacy soft.",
    layout: "cozy",
    swatches: ["#f2f6f3", "#6b9e8a", "#a8c9b8"],
  },
  {
    id: "periwinkle-pause",
    label: "Periwinkle Pause",
    description: "Lavender blue, low stimulation",
    layoutHint: "Legacy soft.",
    layout: "ritual",
    swatches: ["#f3f2f8", "#8b9fd4", "#b8c5e8"],
  },
  {
    id: "sunlit-grove",
    label: "Sunlit Grove",
    description: "Bright mint with golden green",
    layoutHint: "Legacy soft.",
    layout: "cozy",
    swatches: ["#f7faf5", "#5f9e7a", "#e8b86d"],
  },
  {
    id: "twilight-teal",
    label: "Twilight Teal",
    description: "Softer dark mode, teal + amber",
    layoutHint: "Legacy dark.",
    layout: "ritual",
    swatches: ["#152428", "#6bb5c4", "#d4a574"],
  },
  {
    id: "paper-ink",
    label: "Paper & Ink",
    description: "Newsprint neutral with blue pop",
    layoutHint: "Legacy paper.",
    layout: "paper",
    swatches: ["#fafaf8", "#5b8fc7", "#2a2a28"],
  },
];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function getTheme(id: ThemeId): ThemeOption | undefined {
  return THEMES.find((t) => t.id === id);
}

export function themeLayout(id: ThemeId): LayoutId {
  return getTheme(id)?.layout ?? "cozy";
}

export function themeMetaColor(id: ThemeId): string {
  return getTheme(id)?.swatches[0] ?? "#f4f6f8";
}

export function featuredThemes(): ThemeOption[] {
  return FEATURED_THEME_IDS.map((id) => getTheme(id)!).filter(Boolean);
}

export function rethinkThemes(): ThemeOption[] {
  return RETHINK_THEME_IDS.map((id) => getTheme(id)!).filter(Boolean);
}

/** Compact id→layout map for the pre-hydration boot script. */
export const THEME_LAYOUT_BOOT: Record<string, LayoutId> = Object.fromEntries(
  THEMES.map((t) => [t.id, t.layout]),
);
