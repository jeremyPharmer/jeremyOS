export type DailyForecast = {
  date: string;
  highF: number;
  lowF: number;
  code: number;
  label: string;
  icon: string;
  /** Peak daily chance of precipitation, 0–100 */
  precipChancePct: number;
  /** Total precipitation for the day (inches) */
  precipIn: number;
  /** Peak wind speed (mph) when available — used for detailed briefing weather */
  windMphMax?: number;
  /** Peak UV index when available */
  uvIndexMax?: number;
};

export type WeatherForecast = {
  locationLabel: string;
  days: DailyForecast[];
};

export const WEATHER_FORECAST_DAYS = 3;

/** WMO weather code → short label + emoji icon */
export function weatherCodeMeta(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 3) return { label: "Partly cloudy", icon: "⛅" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "❄️" };
  if (code <= 82) return { label: "Showers", icon: "🌦️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Cloudy", icon: "☁️" };
}

type OpenMeteoDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
  wind_speed_10m_max?: number[];
  uv_index_max?: number[];
};

/** Home strip stays 3 days; briefings may request a longer window. */
export async function fetchForecast(
  lat: number,
  lon: number,
  timezone: string,
  locationLabel: string,
  forecastDays = WEATHER_FORECAST_DAYS,
): Promise<WeatherForecast> {
  const daysRequested = Math.min(7, Math.max(1, Math.round(forecastDays)));
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "wind_speed_10m_max",
      "uv_index_max",
    ].join(","),
    timezone,
    forecast_days: String(daysRequested),
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    wind_speed_unit: "mph",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) {
    throw new Error("Weather unavailable");
  }

  const data = (await res.json()) as { daily: OpenMeteoDaily };
  const daily = data.daily;

  const days: DailyForecast[] = daily.time.map((date, i) => {
    const code = daily.weather_code[i] ?? 0;
    const meta = weatherCodeMeta(code);
    const precipInRaw = daily.precipitation_sum?.[i] ?? 0;
    const windRaw = daily.wind_speed_10m_max?.[i];
    const uvRaw = daily.uv_index_max?.[i];
    return {
      date,
      highF: Math.round(daily.temperature_2m_max[i] ?? 0),
      lowF: Math.round(daily.temperature_2m_min[i] ?? 0),
      code,
      label: meta.label,
      icon: meta.icon,
      precipChancePct: Math.round(
        daily.precipitation_probability_max?.[i] ?? 0,
      ),
      precipIn: Math.round(precipInRaw * 100) / 100,
      windMphMax:
        windRaw != null && Number.isFinite(windRaw)
          ? Math.round(windRaw)
          : undefined,
      uvIndexMax:
        uvRaw != null && Number.isFinite(uvRaw)
          ? Math.round(uvRaw)
          : undefined,
    };
  });

  return {
    locationLabel,
    days: days.slice(0, daysRequested),
  };
}

/** One-line briefing note from a daily forecast. */
export function weatherDetailNote(day: DailyForecast): string {
  const bits: string[] = [];
  if (day.precipChancePct >= 40) {
    bits.push(
      day.precipIn >= 0.1
        ? `${day.precipChancePct}% chance of rain (~${day.precipIn.toFixed(2)}")`
        : `${day.precipChancePct}% chance of rain`,
    );
  } else if (day.precipChancePct <= 15) {
    bits.push("Mostly dry");
  }
  if (day.windMphMax != null && day.windMphMax >= 15) {
    bits.push(`winds up to ${day.windMphMax} mph`);
  }
  if (day.uvIndexMax != null && day.uvIndexMax >= 6) {
    bits.push(`UV ${day.uvIndexMax}`);
  }
  if (bits.length === 0) {
    return `${day.label} — high ${day.highF}°, low ${day.lowF}°.`;
  }
  return `${day.label}. ${bits.join(" · ")}. High ${day.highF}° / low ${day.lowF}°.`;
}

/** Approximate coords when geolocation is unavailable */
export const TIMEZONE_FALLBACKS: Record<
  string,
  { lat: number; lon: number; label: string }
> = {
  "America/Los_Angeles": { lat: 34.0522, lon: -118.2437, label: "Los Angeles" },
  "America/Denver": { lat: 39.7392, lon: -104.9903, label: "Denver" },
  "America/Chicago": { lat: 41.8781, lon: -87.6298, label: "Chicago" },
  "America/New_York": { lat: 40.7128, lon: -74.006, label: "New York" },
  "America/Phoenix": { lat: 33.4484, lon: -112.074, label: "Phoenix" },
  "Pacific/Honolulu": { lat: 21.3069, lon: -157.8583, label: "Honolulu" },
};

export function fallbackForTimezone(timezone: string): {
  lat: number;
  lon: number;
  label: string;
} {
  return (
    TIMEZONE_FALLBACKS[timezone] ?? TIMEZONE_FALLBACKS["America/Los_Angeles"]
  );
}

export function dayAbbrev(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

/** @deprecated use dayAbbrev for StayOS-style banner */
export function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function timeGreeting(timezone: string, now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function reverseGeocodeLocation(
  lat: number,
  lon: number,
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "json",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": "JeremyOS/1.0 (https://jeremyos-prod.fly.dev)",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return "Your location";
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        county?: string;
      };
    };
    const a = data.address;
    return (
      a?.city ??
      a?.town ??
      a?.village ??
      a?.hamlet ??
      a?.county ??
      "Your location"
    );
  } catch {
    return "Your location";
  }
}
