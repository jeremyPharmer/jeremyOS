"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { isBillsSeason } from "@/lib/news";
import {
  featuredBullets,
  matchupLabel,
  pickFeaturedGame,
  tickerLabel,
  type BillsGame,
  type BillsPanel,
} from "@/lib/bills";

/** Classic standing/charging buffalo badge (local old-school mark). */
const BILLS_CLASSIC_LOGO = "/bills-classic.svg";

function ScheduleTicker({ games }: { games: BillsGame[] }) {
  if (games.length === 0) return null;
  const labels = games.map(tickerLabel);
  // Duplicate for a seamless marquee loop.
  const loop = [...labels, ...labels];
  return (
    <div className="bills-ticker" aria-label="Upcoming schedule">
      <div className="bills-ticker-track">
        {loop.map((label, i) => (
          <span key={`${label}-${i}`} className="bills-ticker-item">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BillsPanelCard() {
  const { today } = useApp();
  const [panel, setPanel] = useState<BillsPanel | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isBillsSeason(today)) {
      setPanel(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/bills?date=${encodeURIComponent(today)}`);
        const data = (await res.json()) as { panel?: BillsPanel | null };
        if (cancelled) return;
        setPanel(data.panel ?? null);
      } catch {
        if (!cancelled) setPanel(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const featured = useMemo(
    () => (panel ? pickFeaturedGame(panel.games) : null),
    [panel],
  );

  const bullets = useMemo(() => {
    if (!panel || !featured) return [];
    return featuredBullets(featured, panel.streak, panel.record);
  }, [panel, featured]);

  const tickerGames = useMemo(() => {
    if (!panel || !featured) return [];
    return panel.games.filter(
      (g) => g.status === "pre" && g.id !== featured.id,
    );
  }, [panel, featured]);

  if (!loaded || !panel || !isBillsSeason(today)) {
    return null;
  }

  const headline =
    featured?.status === "in"
      ? "Live"
      : featured?.status === "post"
        ? "Last out"
        : "Next up";

  const logoSrc = BILLS_CLASSIC_LOGO;

  return (
    <section
      className="home-card home-card-bills bills-bulletin"
      aria-label="Buffalo Bills"
    >
      <div className="bills-bulletin-hero">
        <div className="bills-buffalo-wrap" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="bills-buffalo"
            src={logoSrc}
            alt=""
            width={84}
            height={84}
          />
        </div>
        <div className="bills-bulletin-copy">
          <p className="bills-bulletin-kicker">Let&apos;s go</p>
          <h2 className="bills-bulletin-title">Buffalo</h2>
          <p className="bills-bulletin-record">
            {panel.record}
            {panel.standing !== "—" ? ` · ${panel.standing}` : ""}
            {panel.streak !== "—" ? ` · ${panel.streak}` : ""}
          </p>
        </div>
      </div>

      {featured ? (
        <div className="bills-next">
          <p className="bills-next-kicker">{headline}</p>
          <p className="bills-next-matchup">{matchupLabel(featured)}</p>
          <p className="bills-next-opponent">{featured.opponentName}</p>
          <ul className="bills-next-bullets">
            {bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tiny bills-empty">Schedule updates when kickoff nears.</p>
      )}

      <ScheduleTicker games={tickerGames} />
    </section>
  );
}
