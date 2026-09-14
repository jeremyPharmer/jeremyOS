"use client";

import type { ReactNode } from "react";
import { HomeDateHeader } from "@/components/HomeDateHeader";
import { WeatherBanner } from "@/components/WeatherBanner";
import { TodayAgendaCard } from "@/components/TodayAgendaCard";
import { TodayRebuildPanel } from "@/components/TodayRebuildPanel";
import { DailyCrosswordCard } from "@/components/DailyCrosswordCard";
import { MoveHubCard } from "@/components/MoveHubCard";
import { WeekPlanPanel } from "@/components/WeekPlanPanel";
import { BillsPanelCard } from "@/components/BillsPanelCard";
import { useHomeLayout } from "@/components/LayoutProvider";
import type { HomeLayoutId } from "@/lib/home-layouts";

type WeekRow = {
  type: string;
  label: string;
  done: number;
  target: number;
};

function AgendaBlock() {
  return <TodayAgendaCard />;
}

function HubsPair({ hero }: { hero?: boolean }) {
  return (
    <div className={hero ? "home-card-grid home-hubs-hero" : "home-card-grid"}>
      <MoveHubCard />
      <DailyCrosswordCard />
    </div>
  );
}

function HeaderStrip({ date }: { date: string }) {
  return (
    <div className="home-header-strip">
      <HomeDateHeader date={date} />
      <WeatherBanner />
    </div>
  );
}

function CrosswordRail() {
  return (
    <div className="home-focus-rail">
      <DailyCrosswordCard />
    </div>
  );
}

function CommandBoard({
  today,
  week,
}: {
  today: string;
  week: WeekRow[];
}) {
  return (
    <div className="home-command-board">
      <WeekPlanPanel today={today} week={week} />
      <DailyCrosswordCard />
    </div>
  );
}

function layoutBody(
  id: HomeLayoutId,
  today: string,
  week: WeekRow[],
): ReactNode {
  switch (id) {
    case "briefing":
      return (
        <>
          <HeaderStrip date={today} />
          <div className="home-today-hero">
            <TodayRebuildPanel />
          </div>
          <AgendaBlock />
          <HubsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "split-day":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <TodayRebuildPanel />
          <AgendaBlock />
          <div className="home-split-day">
            <div className="home-split-primary">
              <MoveHubCard />
            </div>
            <CrosswordRail />
          </div>
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "train-first":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <TodayRebuildPanel />
          <AgendaBlock />
          <div className="home-train-hero">
            <MoveHubCard />
          </div>
          <DailyCrosswordCard />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "ritual":
      return (
        <>
          <div className="home-ritual-date">
            <HomeDateHeader date={today} />
          </div>
          <div className="home-ritual-weather">
            <WeatherBanner />
          </div>
          <div className="home-ritual-today">
            <TodayRebuildPanel />
          </div>
          <AgendaBlock />
          <HubsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "command":
      return (
        <>
          <HeaderStrip date={today} />
          <div className="home-today-compact">
            <TodayRebuildPanel />
          </div>
          <AgendaBlock />
          <MoveHubCard />
          <CommandBoard today={today} week={week} />
        </>
      );
    case "wind-down":
      return (
        <>
          <HomeDateHeader date={today} />
          <TodayRebuildPanel />
          <AgendaBlock />
          <div className="home-wind-hero">
            <DailyCrosswordCard />
          </div>
          <MoveHubCard />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "dual-pillar":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <TodayRebuildPanel />
          <AgendaBlock />
          <HubsPair hero />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "classic":
    default:
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <TodayRebuildPanel />
          <AgendaBlock />
          <HubsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
  }
}

export function HomeShell({
  today,
  week,
}: {
  today: string;
  week: WeekRow[];
}) {
  const { homeLayout } = useHomeLayout();

  return (
    <main
      className={`fade-in home-cos stack home-layout home-layout-${homeLayout}`}
      data-home-layout={homeLayout}
    >
      {layoutBody(homeLayout, today, week)}
      {/* Always the bottom Home card, every layout */}
      <BillsPanelCard />
    </main>
  );
}
