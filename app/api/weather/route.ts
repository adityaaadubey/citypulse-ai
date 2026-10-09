import { NextResponse } from "next/server";
import { fetchWithTimeout, getCached, setCached } from "@/lib/server/cache";
import type { WeatherState } from "@/lib/types";

const codeMap: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
  }

  const cacheKey = `weather:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const cached = getCached<WeatherState>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-CityPulse-Cache": "HIT"
      }
    });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error("Weather provider request failed.");
    }
    const payload = await response.json();
    const current = payload.current;
    const weather: WeatherState = {
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      summary: codeMap[current.weather_code] ?? "Weather code unavailable",
      observedAt: current.time,
      source: "Open-Meteo",
      fetchedAt: new Date().toISOString()
    };
    setCached(cacheKey, weather, 10 * 60 * 1000);
    return NextResponse.json(weather, {
      headers: {
        "X-CityPulse-Cache": "MISS",
        "Cache-Control": "s-maxage=600, stale-while-revalidate=600"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Weather is unavailable right now. No weather fallback was substituted." },
      { status: 502 }
    );
  }
}
