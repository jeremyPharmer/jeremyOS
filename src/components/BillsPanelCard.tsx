"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { isBillsSeason } from "@/lib/news";
import {
  matchupLabel,
  pickFeaturedGame,
  scheduleWhenLabel,
  weekShortLabel,
  type BillsPanel,
} from "@/lib/bills";

const BILLS_LOGO = "/bills-espn.png";

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

  const featuredId = useMemo(() => {
    if (!panel) return null;
    return pickFeaturedGame(panel.games)?.id ?? null;
  }, [panel]);

  if (!loaded || !panel || !isBillsSeason(today)) {
    return null;
  }

  return (
    <section
      className="home-card home-card-bills bills-stub"
      aria-label="Buffalo Bills"
    >
      <div className="bills-stub-perforation" aria-hidden="true" />

      <header className="bills-stub-header">
        <div className="bills-stub-admit">
          <span>Admit one</span>
          <span>2026 season</span>
        </div>
        <div className="bills-stub-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="bills-stub-logo"
            src={BILLS_LOGO}
            alt=""
            width={56}
            height={56}
          />
          <h2 className="bills-stub-title">Buffalo Bills</h2>
          <p className="bills-stub-record">
            {panel.record}
            {panel.standing !== "—" ? ` · ${panel.standing}` : ""}
            {panel.streak !== "—" ? ` · ${panel.streak}` : ""}
          </p>
        </div>
      </header>

      <div className="bills-stub-tear" aria-hidden="true" />

      {panel.games.length === 0 ? (
        <p className="tiny bills-stub-empty">
          Schedule updates when kickoff nears.
        </p>
      ) : (
        <div className="bills-stub-schedule-wrap">
          <div className="bills-stub-cols" aria-hidden="true">
            <span>Week</span>
            <span>Matchup</span>
            <span>When</span>
          </div>
          <ul className="bills-stub-schedule">
            {panel.games.map((game) => {
              const isLive = game.status === "in";
              const isNext = game.id === featuredId && game.status !== "post";
              return (
                <li
                  key={game.id}
                  className={[
                    "bills-stub-row",
                    game.status === "post" ? "is-done" : "",
                    isNext || isLive ? "is-next" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="bills-stub-week">
                    {weekShortLabel(game.weekLabel)}
                    {isLive ? (
                      <span className="bills-stub-stamp">Live</span>
                    ) : null}
                    {isNext && !isLive ? (
                      <span className="bills-stub-stamp">Next</span>
                    ) : null}
                  </span>
                  <span className="bills-stub-matchup">
                    <span className="bills-stub-vs">{matchupLabel(game)}</span>
                    <span className="bills-stub-opp">{game.opponentName}</span>
                  </span>
                  <span className="bills-stub-when">
                    {scheduleWhenLabel(game)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <footer className="bills-stub-footer">
        <div className="bills-stub-barcode" aria-hidden="true" />
        <p className="bills-stub-footer-text">
          Highmark · JeremyOS · Season stub
        </p>
      </footer>
    </section>
  );
}
