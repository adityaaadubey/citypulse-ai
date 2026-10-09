import { NextResponse } from "next/server";
import { fetchWithTimeout, getCached, isRateLimited, setCached } from "@/lib/server/cache";
import type { CitySearchResult } from "@/lib/types";

const cacheTtlMs = 24 * 60 * 60 * 1000;
const minimumRequestWindowMs = 1100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Search query is required." }, { status: 400 });
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<CitySearchResult[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-CityPulse-Cache": "HIT"
      }
    });
  }

  if (isRateLimited("nominatim:search", minimumRequestWindowMs)) {
    return NextResponse.json(
      { error: "City search is rate limited briefly to respect provider policy. Please retry in a moment." },
      { status: 429 }
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "CityPulseAI-Hackathon-Demo/0.1"
      }
    }, 8000);
    if (response.status === 429) {
      return NextResponse.json(
        { error: "OpenStreetMap Nominatim is rate limiting search. Please retry shortly." },
        { status: 429 }
      );
    }
    if (!response.ok) {
      throw new Error("Search provider request failed.");
    }

    const results = (await response.json()) as Array<{
      osm_type?: string;
      osm_id?: number;
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      boundingbox?: [string, string, string, string];
    }>;

    const fetchedAt = new Date().toISOString();
    const normalized = results.map((result, index) => ({
        id: `${result.osm_type ?? "result"}-${result.osm_id ?? index}`,
        name: result.name || result.display_name.split(",")[0],
        displayName: result.display_name,
        coordinates: {
          lat: Number(result.lat),
          lng: Number(result.lon)
        },
        boundingBox: result.boundingbox
          ? [
              Number(result.boundingbox[0]),
              Number(result.boundingbox[1]),
              Number(result.boundingbox[2]),
              Number(result.boundingbox[3])
            ]
          : undefined,
        source: "OpenStreetMap Nominatim",
        fetchedAt
      }));

    setCached(cacheKey, normalized, cacheTtlMs);

    return NextResponse.json(normalized, {
      headers: {
        "X-CityPulse-Cache": "MISS",
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "City search is unavailable. No search fallback records were substituted." },
      { status: 502 }
    );
  }
}
