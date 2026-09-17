"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import {
  dateShortLabel,
  isSoccerSeason,
  matchupLabel,
  pickFeaturedGame,
  scheduleWhenLabel,
  type SoccerPanel,
} from "@/lib/soccer";
import { calendarDayInTz } from "@/lib/journey";

const WARRIORS_LOGO = "/schroeder-warriors-logo.png";

export function SoccerPanelCard() {
  const { today } = useApp();
  const [panel, setPanel] = useState<SoccerPanel | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isSoccerSeason(today)) {
      setPanel(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/soccer?date=${encodeURIComponent(today)}`,
        );
        const data = (await res.json()) as { panel?: SoccerPanel | null };
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

  if (!loaded || !panel || !isSoccerSeason(today)) {
    return null;
  }

  return (
    <a
      className="home-card home-card-soccer soccer-stub"
      aria-label="Warriors soccer"
      href={panel.clubhouseUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="soccer-stub-perforation" aria-hidden="true" />

      <header className="soccer-stub-header">
        <div className="soccer-stub-admit">
          <span>Admit one</span>
          <span>Fall 2026</span>
        </div>
        <div className="soccer-stub-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="soccer-stub-logo"
            src={WARRIORS_LOGO}
            alt=""
            width={56}
            height={56}
          />
          <h2 className="soccer-stub-title">Warriors</h2>
          <p className="soccer-stub-record">
            {panel.record}
            {panel.standing !== "—" ? ` · ${panel.standing}` : ""}
            {panel.streak !== "—" ? ` · ${panel.streak}` : ""}
          </p>
        </div>
      </header>

      <div className="soccer-stub-tear" aria-hidden="true" />

      {panel.games.length === 0 ? (
        <p className="tiny soccer-stub-empty">
          Schedule updates when kickoff nears.
        </p>
      ) : (
        <div className="soccer-stub-schedule-wrap">
          <div className="soccer-stub-cols" aria-hidden="true">
            <span>Date</span>
            <span>Matchup</span>
            <span>When</span>
          </div>
          <ul className="soccer-stub-schedule">
            {panel.games.map((game) => {
              const isLive = game.status === "in";
              const isToday =
                game.status !== "post" &&
                calendarDayInTz(game.date) === today;
              const isNext = game.id === featuredId && game.status !== "post";
              return (
                <li
                  key={game.id}
                  className={[
                    "soccer-stub-row",
                    game.status === "post" ? "is-done" : "",
                    isToday
                      ? "is-gameday-row"
                      : isNext || isLive
                        ? "is-next"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="soccer-stub-week">
                    {dateShortLabel(game.date)}
                    {isLive ? (
                      <span className="soccer-stub-stamp is-gameday">Live</span>
                    ) : null}
                    {isToday && !isLive ? (
                      <span className="soccer-stub-stamp is-gameday">
                        Gameday
                      </span>
                    ) : null}
                    {isNext && !isLive && !isToday ? (
                      <span className="soccer-stub-stamp">Next</span>
                    ) : null}
                  </span>
                  <span className="soccer-stub-matchup">
                    <span className="soccer-stub-vs">{matchupLabel(game)}</span>
                    <span className="soccer-stub-opp">{game.opponentName}</span>
                  </span>
                  <span className="soccer-stub-when">
                    {scheduleWhenLabel(game)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <footer className="soccer-stub-footer">
        <div className="soccer-stub-barcode" aria-hidden="true" />
        <p className="soccer-stub-footer-text">
          Ridge Rd · JeremyOS · Season stub
        </p>
      </footer>
    </a>
  );
}
