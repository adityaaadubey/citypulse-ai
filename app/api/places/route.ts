import { NextResponse } from "next/server";
import { fetchWithTimeout, getCached, isRateLimited, setCached } from "@/lib/server/cache";
import { buildOverpassQuery, normalizeOverpassElements } from "@/lib/server/overpass";
import type { PlaceCategory, PlacesResponse } from "@/lib/types";

const validCategories: PlaceCategory[] = ["food", "attraction", "heritage", "hotel", "budget"];
const cacheTtlMs = 15 * 60 * 1000;
const minimumRequestWindowMs = 1200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusMeters = clamp(Number(searchParams.get("radius") ?? 3500), 750, 6000);
  const categories = parseCategories(searchParams.get("categories"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Latitude and longitude are required for live POI lookup." }, { status: 400 });
  }

  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const cacheKey = `places:${roundedLat}:${roundedLng}:${radiusMeters}:${categories.join(",")}`;
  const cached = getCached<PlacesResponse>(cacheKey);

  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  if (isRateLimited(`overpass:${roundedLat}:${roundedLng}`, minimumRequestWindowMs)) {
    return NextResponse.json(
      { error: "Live POI lookup is rate limited briefly. Please retry in a moment." },
      { status: 429 }
    );
  }

  const fetchedAt = new Date().toISOString();
  const query = buildOverpassQuery(lat, lng, radiusMeters, categories);

  try {
    const response = await fetchWithTimeout(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "CityPulseAI-Hackathon-Demo/0.1"
        },
        body: new URLSearchParams({ data: query })
      },
      14000
    );

    if (response.status === 429) {
      return NextResponse.json(
        { error: "OpenStreetMap Overpass is rate limiting this request. Please retry shortly." },
        { status: 429 }
      );
    }

    if (!response.ok) {
      throw new Error(`Overpass returned ${response.status}`);
    }

    const payload = (await response.json()) as { elements?: unknown[] };
    const places = normalizeOverpassElements((payload.elements ?? []) as never[], fetchedAt);
    const data: PlacesResponse = {
      places,
      source: "OpenStreetMap Overpass",
      attribution: "POI data © OpenStreetMap contributors via Overpass API.",
      fetchedAt,
      cached: false,
      query: { lat, lng, radiusMeters, categories },
      warning: places.length ? undefined : "No matching OpenStreetMap POIs were returned for this area and filter set."
    };

    setCached(cacheKey, data, cacheTtlMs);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Live OpenStreetMap POI lookup failed. No fallback records were substituted." },
      { status: 502 }
    );
  }
}

function parseCategories(value: string | null): PlaceCategory[] {
  if (!value) return validCategories;
  const parsed = value
    .split(",")
    .map((category) => category.trim())
    .filter((category): category is PlaceCategory => validCategories.includes(category as PlaceCategory));
  return parsed.length ? parsed : validCategories;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
