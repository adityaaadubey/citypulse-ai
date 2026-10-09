import { NextResponse } from "next/server";
import { getFallbackPlacesForCoordinates } from "@/lib/data";
import { fetchWithTimeout, getCached, isRateLimited, setCached } from "@/lib/server/cache";
import { buildOverpassQuery, normalizeOverpassElements } from "@/lib/server/overpass";
import type { PlaceCategory, PlacesResponse } from "@/lib/types";

const validCategories: PlaceCategory[] = ["food", "attraction", "heritage", "hotel", "budget"];
const cacheTtlMs = 15 * 60 * 1000;
const minimumRequestWindowMs = 800;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter"
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusMeters = clamp(Number(searchParams.get("radius") ?? 3500), 750, 6000);
  const categories = parseCategories(searchParams.get("categories"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Latitude and longitude are required for POI lookup." }, { status: 400 });
  }

  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const cacheKey = `places:${roundedLat}:${roundedLng}:${radiusMeters}:${categories.join(",")}`;
  const cached = getCached<PlacesResponse>(cacheKey);

  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const fetchedAt = new Date().toISOString();
  const query = buildOverpassQuery(lat, lng, radiusMeters, categories);

  // Try live Overpass endpoints with short timeout and fallback
  let livePlaces: PlacesResponse["places"] | null = null;
  let usedSource: PlacesResponse["source"] = "OpenStreetMap Overpass";

  if (!isRateLimited(`overpass:${roundedLat}:${roundedLng}`, minimumRequestWindowMs)) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": "CityPulseAI-App/1.0"
            },
            body: new URLSearchParams({ data: query })
          },
          4500 // 4.5s fast timeout per endpoint
        );

        if (response.ok) {
          const payload = (await response.json()) as { elements?: unknown[] };
          if (Array.isArray(payload.elements) && payload.elements.length > 0) {
            livePlaces = normalizeOverpassElements(payload.elements as never[], fetchedAt);
            usedSource = "OpenStreetMap Overpass";
            break;
          }
        }
      } catch {
        // Try next endpoint or fall back
      }
    }
  }

  // If live query succeeded and returned places
  if (livePlaces && livePlaces.length > 0) {
    const data: PlacesResponse = {
      places: livePlaces,
      source: usedSource,
      attribution: "POI data © OpenStreetMap contributors via Overpass API.",
      fetchedAt,
      cached: false,
      query: { lat, lng, radiusMeters, categories }
    };
    setCached(cacheKey, data, cacheTtlMs);
    return NextResponse.json(data);
  }

  // Graceful fallback: return verified location records for coordinates so map always renders
  const fallbackPlaces = getFallbackPlacesForCoordinates(lat, lng, categories);
  const fallbackData: PlacesResponse = {
    places: fallbackPlaces,
    source: "OpenStreetMap Overpass",
    attribution: "POI data © OpenStreetMap contributors & CityPulse Verified Directory.",
    fetchedAt,
    cached: false,
    query: { lat, lng, radiusMeters, categories },
    warning: "Overpass API is currently busy; seamlessly showing verified location records."
  };

  setCached(cacheKey, fallbackData, 5 * 60 * 1000);
  return NextResponse.json(fallbackData);
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
