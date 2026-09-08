"use client";

import Link from "next/link";
import {
  HOME_LAYOUTS,
  PREVIEW_BLOCK_LABELS,
  type HomeBlockId,
  type HomeLayoutId,
} from "@/lib/home-layouts";
import { useHomeLayout } from "@/components/LayoutProvider";

function GalleryWireframe({ rows }: { rows: HomeBlockId[][] }) {
  return (
    <div className="layout-gallery-wire" aria-hidden>
      {rows.map((row, i) => (
        <div
          key={i}
          className="layout-wire-row"
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map((block, j) => (
            <div
              key={`${block}-${j}`}
              className={`layout-wire-block layout-wire-${block}`}
            >
              {PREVIEW_BLOCK_LABELS[block]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LayoutsPage() {
  const { homeLayout, setHomeLayout } = useHomeLayout();

  return (
    <main className="page layouts-board">
      <header className="layouts-board-header">
        <p className="eyebrow">Home structure</p>
        <h1>Layout gallery</h1>
        <p className="muted">
          Eight clean, modern Home compositions for JeremyOS. Tap one to apply —
          then open Home to live with it. Colors stay on Themes; this is
          structure only.
        </p>
        <div className="layouts-board-links">
          <Link href="/" className="layouts-board-link">
            ← Back to Home
          </Link>
          <Link href="/layouts/calendar-day" className="layouts-board-link">
            Calendar day samples →
          </Link>
          <Link href="/settings" className="layouts-board-link">
            Settings
          </Link>
          <Link href="/themes" className="layouts-board-link">
            Color themes
          </Link>
        </div>
      </header>

      <section className="layouts-gallery-grid">
        {HOME_LAYOUTS.map((option) => {
          const active = homeLayout === option.id;
          return (
            <article
              key={option.id}
              className={
                active
                  ? "layout-gallery-card layout-gallery-card-active"
                  : "layout-gallery-card"
              }
            >
              <GalleryWireframe rows={option.preview} />
              <div className="layout-gallery-body">
                <div className="layout-gallery-title-row">
                  <h2>{option.label}</h2>
                  {active ? (
                    <span className="layout-pick-badge">Active</span>
                  ) : null}
                </div>
                <p className="layout-gallery-tagline">{option.tagline}</p>
                <p className="muted layout-gallery-desc">{option.description}</p>
                <p className="layout-gallery-best">
                  <strong>Best for:</strong> {option.bestFor}
                </p>
                <button
                  type="button"
                  className={active ? "btn ghost" : "btn primary"}
                  onClick={() => setHomeLayout(option.id as HomeLayoutId)}
                  aria-pressed={active}
                >
                  {active ? "Using this layout" : "Use this layout"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
