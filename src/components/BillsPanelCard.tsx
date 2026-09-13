"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { isBillsSeason } from "@/lib/news";
import type { BillsGame, BillsPanel } from "@/lib/bills";

function vsLine(game: BillsGame): string {
  return game.homeAway === "home"
    ? `vs ${game.opponentAbbr}`
    : `@ ${game.opponentAbbr}`;
}

function scoreLine(game: BillsGame): string {
  if (game.status === "pre") {
    return game.statusDetail || "Upcoming";
  }
  if (game.billsScore == null || game.opponentScore == null) {
    return game.statusDetail || "TBD";
  }
  const ours = game.billsScore;
  const theirs = game.opponentScore;
  if (game.status === "in") {
    return `${ours}–${theirs} · Live`;
  }
  if (game.billsWon === true) return `W ${ours}–${theirs}`;
  if (game.billsWon === false) return `L ${ours}–${theirs}`;
  return `${ours}–${theirs}`;
}

function GameRow({ game }: { game: BillsGame }) {
  return (
    <li className={`bills-game bills-game-${game.status}`}>
      <div className="bills-game-main">
        <span className="bills-game-matchup">{vsLine(game)}</span>
        <span className="bills-game-week">{game.weekLabel}</span>
      </div>
      <div className="bills-game-meta">
        <span className="bills-game-score">{scoreLine(game)}</span>
        {game.status === "in" && game.statusDetail ? (
          <span className="bills-game-when">{game.statusDetail}</span>
        ) : null}
      </div>
    </li>
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

  if (!loaded || !panel || !isBillsSeason(today)) {
    return null;
  }

  const empty = panel.games.length === 0;

  return (
    <section className="home-card home-card-bills" aria-label="Buffalo Bills">
      <div className="home-card-head-row">
        <div className="home-card-head">
          <p className="home-card-kicker">NFL</p>
          <h2>Buffalo Bills</h2>
          <p className="tiny home-card-sub">
            {panel.record}
            {panel.standing !== "—" ? ` · ${panel.standing}` : ""}
            {panel.streak !== "—" ? ` · ${panel.streak}` : ""}
          </p>
        </div>
        {panel.logoUrl ? (
          // ESPN CDN logo — decorative
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="bills-logo"
            src={panel.logoUrl}
            alt=""
            width={40}
            height={40}
          />
        ) : null}
      </div>

      <div className="bills-stats" aria-label="Season stats">
        <div className="bills-stat">
          <span className="bills-stat-label">Record</span>
          <span className="bills-stat-value">{panel.record}</span>
        </div>
        <div className="bills-stat">
          <span className="bills-stat-label">Division</span>
          <span className="bills-stat-value">{panel.standing}</span>
        </div>
        <div className="bills-stat">
          <span className="bills-stat-label">Streak</span>
          <span className="bills-stat-value">{panel.streak}</span>
        </div>
      </div>

      {empty ? (
        <p className="tiny bills-empty">Schedule updates when kickoff nears.</p>
      ) : (
        <ul className="bills-schedule">
          {panel.games.map((g) => (
            <GameRow key={g.id} game={g} />
          ))}
        </ul>
      )}

      <a
        className="btn ghost bills-open-link"
        href={panel.clubhouseUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open on ESPN →
      </a>
    </section>
  );
}
