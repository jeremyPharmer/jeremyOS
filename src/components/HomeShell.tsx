"use client";

import type { ReactNode } from "react";
import { HomeDateHeader } from "@/components/HomeDateHeader";
import { WeatherBanner } from "@/components/WeatherBanner";
import { HomeDayHub } from "@/components/HomeDayHub";
import { DailyCrosswordCard } from "@/components/DailyCrosswordCard";
import { WeekPlanPanel } from "@/components/WeekPlanPanel";
import { BillsPanelCard } from "@/components/BillsPanelCard";
import { SoccerPanelCard } from "@/components/SoccerPanelCard";
import { SaveGoalsCard } from "@/components/SaveGoalsCard";
import { useHomeLayout } from "@/components/LayoutProvider";
import type { HomeLayoutId } from "@/lib/home-layouts";

function SportsPair() {
  return (
    <>
      <BillsPanelCard />
      <SoccerPanelCard />
    </>
  );
}

type WeekRow = {
  type: string;
  label: string;
  done: number;
  target: number;
};

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

function DayHubHero({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "home-today-compact" : "home-today-hero"}>
      <HomeDayHub />
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
          <DayHubHero />
          <SaveGoalsCard />
          <DailyCrosswordCard />
          <SportsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "split-day":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <HomeDayHub />
          <SaveGoalsCard />
          <CrosswordRail />
          <SportsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "train-first":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <HomeDayHub />
          <SaveGoalsCard />
          <DailyCrosswordCard />
          <SportsPair />
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
            <HomeDayHub />
          </div>
          <SaveGoalsCard />
          <DailyCrosswordCard />
          <SportsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "command":
      return (
        <>
          <HeaderStrip date={today} />
          <DayHubHero compact />
          <SaveGoalsCard />
          <CommandBoard today={today} week={week} />
          <SportsPair />
        </>
      );
    case "wind-down":
      return (
        <>
          <HomeDateHeader date={today} />
          <HomeDayHub />
          <SaveGoalsCard />
          <div className="home-wind-hero">
            <DailyCrosswordCard />
          </div>
          <SportsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "dual-pillar":
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <HomeDayHub />
          <SaveGoalsCard />
          <DailyCrosswordCard />
          <SportsPair />
          <WeekPlanPanel today={today} week={week} />
        </>
      );
    case "classic":
    default:
      return (
        <>
          <HomeDateHeader date={today} />
          <WeatherBanner />
          <HomeDayHub />
          <SaveGoalsCard />
          <DailyCrosswordCard />
          <SportsPair />
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
    <div className={`home-cos home-layout home-layout-${homeLayout}`}>
      {layoutBody(homeLayout, today, week)}
    </div>
  );
}
