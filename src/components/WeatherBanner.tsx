"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { HomeOpenCloseButtons } from "@/components/HomeOpenCloseButtons";
import {
  dayAbbrev,
  dayLabel,
  timeGreeting,
  type DailyForecast,
  type WeatherForecast,
} from "@/lib/weather";

const COORDS_KEY = "rebuild-weather-coords";

type StoredCoords = {
  lat: number;
  lon: number;
  label: string;
};

function readStoredCoords(): StoredCoords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCoords;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      typeof parsed.label === "string"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function storeCoords(coords: StoredCoords) {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

function precipLine(day: DailyForecast): string {
  if (day.precipChancePct <= 0 && day.precipIn <= 0) return "Dry";
  if (day.precipIn >= 0.05) {
    return `${day.precipChancePct}% · ${day.precipIn.toFixed(2)}"`;
  }
  return `${day.precipChancePct}% rain`;
}

export function WeatherBanner() {
  const { state, today } = useApp();
  const timezone = state.profile?.timezone ?? "America/Los_Angeles";
  const greeting = timeGreeting(timezone);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(lat?: number, lon?: number, label?: string) {
      const qs = new URLSearchParams();
      if (lat != null && lon != null) {
        qs.set("lat", String(lat));
        qs.set("lon", String(lon));
        if (label && label !== "Near you") qs.set("label", label);
      }
      const res = await fetch(`/api/weather?${qs.toString()}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Weather unavailable");
        return;
      }
      const coords: StoredCoords = {
        lat: lat ?? 0,
        lon: lon ?? 0,
        label: data.locationLabel,
      };
      if (lat != null && lon != null) storeCoords(coords);
      setForecast({ locationLabel: data.locationLabel, days: data.days });
      setError("");
    }

    function requestForecast(coords?: StoredCoords) {
      if (coords) {
        void load(coords.lat, coords.lon, coords.label);
        return;
      }
      void load();
    }

    const stored = readStoredCoords();
    if (stored) {
      requestForecast(stored);
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void load(pos.coords.latitude, pos.coords.longitude);
        },
        () => requestForecast(),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
      );
    } else {
      requestForecast();
    }

    return () => {
      cancelled = true;
    };
  }, [timezone]);

  return (
    <header className="home-top-banner">
      <div className="home-greeting-row">
        <p className="home-greeting">{greeting}</p>
        <HomeOpenCloseButtons />
      </div>

      {error && !forecast && (
        <section className="weather-strip weather-strip-muted" aria-label="Weather">
          <p className="tiny muted">{error}</p>
        </section>
      )}

      {!error && !forecast && (
        <section className="weather-strip weather-strip-muted" aria-label="Weather">
          <p className="tiny muted">Loading forecast…</p>
        </section>
      )}

      {forecast && (
        <section className="weather-strip" aria-label="3-day weather forecast">
          <div className="weather-strip-head">
            <p className="weather-location">{forecast.locationLabel}</p>
            <p className="weather-strip-range">Next 3 days</p>
          </div>
          <div className="weather-strip-days">
            {forecast.days.map((day) => (
              <div key={day.date} className="weather-strip-day">
                <span className="weather-strip-dow">
                  {day.date === today ? "Today" : dayAbbrev(day.date)}
                </span>
                <span
                  className="weather-strip-icon"
                  aria-hidden
                  title={day.label}
                >
                  {day.icon}
                </span>
                <span className="weather-strip-label">{day.label}</span>
                <span className="weather-strip-temps">
                  <span className="weather-strip-high">{day.highF}°</span>
                  <span className="weather-strip-low">{day.lowF}°</span>
                </span>
                <span className="weather-strip-precip">{precipLine(day)}</span>
                <span className="sr-only">
                  {dayLabel(day.date, today)}: {day.label}, high {day.highF},
                  low {day.lowF}, {precipLine(day)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </header>
  );
}
