"use client";

import Link from "next/link";
import "./landing-looks.css";

const OPTIONS = [
  {
    id: "graph-sketches",
    name: "1 · Graph + sketches",
    vibe: "Light blueprint grid with soft diagram arcs and node dots — planner energy.",
  },
  {
    id: "cafe-sage",
    name: "2 · Café sage",
    vibe: "Moss linen wash, fern silhouettes, deep cards with warm lift shadows.",
  },
  {
    id: "plant-pots",
    name: "3 · Plant pots",
    vibe: "Corner terracotta pots + trailing vines on cool graph paper. Shop-window feel.",
  },
  {
    id: "jazz-vinyl",
    name: "4 · Jazz vinyl",
    vibe: "Concentric groove rings under a pale grid — late-night café, soft amber accents.",
  },
  {
    id: "macrame",
    name: "5 · Macramé fringe",
    vibe: "Woven geometric fringe + knotted dots. Modern boho border, not costume.",
  },
  {
    id: "herb-garden",
    name: "6 · Herb garden",
    vibe: "Scattered leaf stamps and dashed grow-lines on seafoam graph paper.",
  },
  {
    id: "cork-clay",
    name: "7 · Cork & clay",
    vibe: "Textured cork wash, clay-edged cards with real stacked depth.",
  },
  {
    id: "groovy-waves",
    name: "8 · Groovy waves",
    vibe: "Soft sine waves over a fine grid — 70s lounge without neon.",
  },
  {
    id: "espresso-foam",
    name: "9 · Espresso foam",
    vibe: "Latte swirl clouds on cool stone paper; cards float like saucers.",
  },
  {
    id: "studio-desk",
    name: "10 · Studio desk",
    vibe: "Drafting triangles, rulers, and plant cuttings — creative-desk landing.",
  },
] as const;

type OptId = (typeof OPTIONS)[number]["id"];

function MockCard({
  title,
  meta,
  deep,
}: {
  title: string;
  meta: string;
  deep?: boolean;
}) {
  return (
    <div className={`ll-card${deep ? " is-deep" : ""}`}>
      <p className="ll-card-kicker">{meta}</p>
      <h3>{title}</h3>
      <p className="ll-card-body">Morning open · tasks · money at a glance.</p>
    </div>
  );
}

function LandingPhone({ id }: { id: OptId }) {
  return (
    <article className={`ll-phone ll-${id}`} data-look={id}>
      <div className="ll-backdrop" aria-hidden>
        <div className="ll-layer ll-grid" />
        <div className="ll-layer ll-diagram" />
        <div className="ll-layer ll-flora" />
        <div className="ll-layer ll-accent" />
      </div>

      <div className="ll-content">
        <header className="ll-hero">
          <p className="ll-brand">JeremyOS</p>
          <h2>Welcome back.</h2>
          <p className="ll-lead">Your day, pottered and planned.</p>
        </header>

        <div className="ll-stack">
          <MockCard title="Today's briefing" meta="Open" deep />
          <MockCard title="Move · Crossword" meta="Hubs" deep />
          <button type="button" className="ll-cta">
            Sign in
          </button>
        </div>
      </div>
    </article>
  );
}

export default function LandingLooksPage() {
  return (
    <main className="ll-board">
      <header className="ll-board-head">
        <p className="ll-eyebrow">Landing · backdrop ideas</p>
        <h1>Ten jazzy café-boho looks</h1>
        <p className="ll-intro">
          Light graph paper, plant life, soft diagrams, and cards with depth.
          Same landing content — different atmosphere. Pick a vibe; we can wire
          the winner into login / home later.
        </p>
        <div className="ll-links">
          <Link href="/">← Home</Link>
          <Link href="/themes">Themes</Link>
          <Link href="/login">Login</Link>
          <Link href="/bills-looks">Bills looks</Link>
        </div>
      </header>

      <section className="ll-grid-board">
        {OPTIONS.map((opt) => (
          <article key={opt.id} className="ll-option" id={opt.id}>
            <header className="ll-option-head">
              <h2>{opt.name}</h2>
              <p>{opt.vibe}</p>
            </header>
            <LandingPhone id={opt.id} />
          </article>
        ))}
      </section>
    </main>
  );
}
