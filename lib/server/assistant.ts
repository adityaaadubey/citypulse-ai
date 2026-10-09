import { GoogleGenAI } from "@google/genai";
import { distanceKm } from "@/lib/data";
import type {
  AssistantItinerary,
  AssistantResponse,
  Coordinates,
  IncidentCategory,
  ItineraryStep,
  NumericCalculations,
  Place,
  PlaceCategory
} from "@/lib/types";

export type {
  AssistantItinerary,
  AssistantResponse,
  ItineraryStep,
  NumericCalculations
};


export type AssistantInputPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  coordinates: Coordinates;
  area: string;
  description: string;
  source: string;
  sourceUrl?: string;
  tags?: string[];
  safetyNotes?: string[];
  budget?: "low" | "medium" | "high";
};

export type AssistantInputReport = {
  id: string;
  category: IncidentCategory;
  title: string;
  detail: string;
  coordinates: Coordinates;
  area: string;
  createdAt: string;
  status: "unverified" | "reviewed";
  moderationStatus?: string;
};

export type AssistantInputWeather = {
  temperature: number;
  windSpeed: number;
  weatherCode?: number;
  summary: string;
  observedAt: string;
  source: string;
};

export type AssistantRequestPayload = {
  question: string;
  city?: string;
  cityCenter?: Coordinates;
  selectedPlaceId?: string;
  places?: AssistantInputPlace[];
  weather?: AssistantInputWeather | null;
  reports?: AssistantInputReport[];
  routePlaceIds?: string[];
};


const DISCLAIMER_TEXT =
  "CityPulse AI guidance is generated using available OpenStreetMap POIs, Open-Meteo weather data, and unverified community reports. Never treat community reports as official safety or crime metrics. Lack of reported incidents does not guarantee safety. Verify operating hours, prices, and accessibility from official sources.";

/**
 * Perform all deterministic numeric calculations in code
 */
export function calculateNumericResults(
  places: AssistantInputPlace[],
  reports: AssistantInputReport[],
  center: Coordinates,
  routePlaceIds?: string[]
): NumericCalculations {
  const placesByCategory: Record<string, number> = {};
  for (const p of places) {
    placesByCategory[p.category] = (placesByCategory[p.category] || 0) + 1;
  }

  const reportsByCategory: Record<string, number> = {};
  let unverifiedCount = 0;
  let reviewedCount = 0;
  let minReportDist: number | null = null;

  for (const r of reports) {
    reportsByCategory[r.category] = (reportsByCategory[r.category] || 0) + 1;
    if (r.status === "unverified") unverifiedCount++;
    else reviewedCount++;

    const dist = distanceKm(center, r.coordinates);
    if (minReportDist === null || dist < minReportDist) {
      minReportDist = Number(dist.toFixed(2));
    }
  }

  let routeDistanceKm: number | null = null;
  if (routePlaceIds && routePlaceIds.length >= 2) {
    const routePlaces = routePlaceIds
      .map((id) => places.find((p) => p.id === id))
      .filter((p): p is AssistantInputPlace => Boolean(p));

    if (routePlaces.length >= 2) {
      let sum = 0;
      for (let i = 0; i < routePlaces.length - 1; i++) {
        sum += distanceKm(routePlaces[i].coordinates, routePlaces[i + 1].coordinates);
      }
      routeDistanceKm = Number(sum.toFixed(2));
    }
  }

  return {
    placesCount: places.length,
    placesByCategory,
    reportsCount: reports.length,
    unverifiedReportsCount: unverifiedCount,
    reviewedReportsCount: reviewedCount,
    reportsByCategory,
    closestReportDistanceKm: minReportDist,
    routeDistanceKm
  };
}

/**
 * Deterministic fallback generator when Gemini is unavailable, timed out, or quota exceeded
 */
export function generateDeterministicFallback(
  payload: AssistantRequestPayload,
  reason: string
): AssistantResponse {
  const city = payload.city || "Pune";
  const center = payload.cityCenter || { lat: 18.5204, lng: 73.8567 };
  const places = (payload.places || []).slice(0, 15);
  const reports = (payload.reports || []).slice(0, 15);
  const weather = payload.weather;
  const question = (payload.question || "").toLowerCase();

  const numerics = calculateNumericResults(places, reports, center, payload.routePlaceIds);

  // Identify relevant places
  let selected = places;
  if (question.includes("food") || question.includes("eat") || question.includes("cafe")) {
    const food = places.filter((p) => p.category === "food");
    if (food.length) selected = food;
  } else if (question.includes("heritage") || question.includes("history")) {
    const heritage = places.filter((p) => p.category === "heritage");
    if (heritage.length) selected = heritage;
  } else if (question.includes("hotel") || question.includes("stay")) {
    const hotels = places.filter((p) => p.category === "hotel");
    if (hotels.length) selected = hotels;
  } else if (question.includes("budget") || question.includes("cheap")) {
    const budget = places.filter((p) => p.category === "budget" || p.budget === "low");
    if (budget.length) selected = budget;
  }

  const recommendedPlaces = selected.slice(0, 4);
  const recommendedPlaceIds = recommendedPlaces.map((p) => p.id);

  // Build step-by-step itinerary using code-calculated distances
  const steps: ItineraryStep[] = [];
  let totalDist = 0;
  for (let i = 0; i < recommendedPlaces.length; i++) {
    const place = recommendedPlaces[i];
    const prevCoords = i === 0 ? center : recommendedPlaces[i - 1].coordinates;
    const distFromPrev = Number(distanceKm(prevCoords, place.coordinates).toFixed(2));
    totalDist += distFromPrev;

    const weatherContext = weather
      ? `${Math.round(weather.temperature)}°C (${weather.summary})`
      : undefined;

    steps.push({
      placeId: place.id,
      placeName: place.name,
      category: place.category,
      distanceFromPrevKm: distFromPrev,
      note: `${place.category.toUpperCase()} in ${place.area}. ${place.description || "Public landmark."}`,
      weatherContext
    });
  }

  // Weather observation
  const weatherObservation = weather
    ? `Current conditions in ${city}: ${weather.summary}, ${Math.round(weather.temperature)}°C, wind speed ${weather.windSpeed} km/h (source: ${weather.source}, observed ${weather.observedAt}).`
    : `Weather data is currently not loaded for ${city}.`;

  // Safety summary based on reports
  let safetySummary = `Found ${reports.length} community incident report(s) nearby (${numerics.unverifiedReportsCount} unverified).`;
  if (numerics.closestReportDistanceKm !== null) {
    safetySummary += ` Closest recorded report is ~${numerics.closestReportDistanceKm} km from the reference center.`;
  }
  if (reports.length === 0) {
    safetySummary = "No incident reports are currently logged for this area. Note: Absence of reports does NOT guarantee safety.";
  }

  // Answer formulation
  const placeNames = recommendedPlaces.map((p) => p.name).join(", ");
  const answer = `[Deterministic Plan for ${city}]\n` +
    (recommendedPlaces.length > 0
      ? `Based on ${places.length} available OpenStreetMap records, suggested stops are: ${placeNames}.\n`
      : `No matching POIs are currently loaded for this area.\n`) +
    `${weatherObservation}\n` +
    `${safetySummary}\n` +
    `Note: This response was generated deterministically (${reason}).`;

  return {
    answer,
    source: "deterministic_fallback",
    recommendedPlaceIds,
    itinerary:
      steps.length > 0
        ? {
            title: `Exploration Route for ${city}`,
            estimatedTotalKm: Number(totalDist.toFixed(2)),
            steps
          }
        : undefined,
    weatherObservation,
    safetySummary,
    affordabilityGuidance: "Public OpenStreetMap POI data does not provide live price lists or commercial rates. Verify budget details directly.",
    numericCalculations: numerics,
    disclaimer: DISCLAIMER_TEXT,
    fallbackReason: reason
  };
}

/**
 * Execute Gemini model call with schema constraints, timeouts, and quota protection
 */
export async function queryGeminiAssistant(
  payload: AssistantRequestPayload,
  apiKey: string,
  modelName: string = "gemini-3.5-flash-lite",
  timeoutMs: number = 12000
): Promise<AssistantResponse> {
  const city = payload.city || "Pune";
  const center = payload.cityCenter || { lat: 18.5204, lng: 73.8567 };
  const places = (payload.places || []).slice(0, 15);
  const reports = (payload.reports || []).slice(0, 15);
  const weather = payload.weather;

  // 1. Calculate numeric facts in code
  const numerics = calculateNumericResults(places, reports, center, payload.routePlaceIds);

  // 2. Prepare concise ground truth data for the model
  const placeRecords = places.map((p) => {
    const distToCenter = Number(distanceKm(center, p.coordinates).toFixed(2));
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      area: p.area,
      distanceFromCenterKm: distToCenter,
      description: p.description,
      sourceUrl: p.sourceUrl || p.source,
      tags: p.tags || [],
      safetyNotes: p.safetyNotes || []
    };
  });

  const reportRecords = reports.map((r) => {
    const dist = Number(distanceKm(center, r.coordinates).toFixed(2));
    return {
      id: r.id,
      category: r.category,
      title: r.title,
      area: r.area,
      createdAt: r.createdAt,
      status: r.status, // "unverified" or "reviewed"
      distanceFromCenterKm: dist
    };
  });

  const systemInstruction = `You are CityPulse AI, a smart city situational intelligence companion.
STRICT OPERATIONAL CONSTRAINTS:
1. RECOMMENDATIONS: You may ONLY recommend and reference places that appear in the supplied "Places" array. You must provide their exact "id" in "recommendedPlaceIds" and in any itinerary steps. NEVER invent, hallucinate, or reference places not in the provided list.
2. NO FABRICATION: Never fabricate real-time traffic speeds, crime rates, ticket prices, commercial ratings, or accessibility claims. If asked about prices or traffic, explicitly state that live price/traffic data is not present in OpenStreetMap.
3. DATA LABELS & SEPARATION: Clearly distinguish public OpenStreetMap POIs, Open-Meteo weather data, and unverified community reports. Emphasize that "no community reports" does NOT equal "safe".
4. WEATHER CONTEXT: Incorporate the provided temperature, wind speed, and weather condition when suggesting walking or outdoor activities.
5. NUMERIC ACCURACY: Use the pre-calculated distances and counts provided in the context; do not invent your own math.`;

  const userPrompt = JSON.stringify({
    userQuestion: payload.question,
    city,
    weather: weather
      ? {
          temperature: weather.temperature,
          windSpeed: weather.windSpeed,
          condition: weather.summary,
          observedAt: weather.observedAt,
          source: weather.source
        }
      : null,
    codeCalculatedMetrics: numerics,
    places: placeRecords,
    communityReports: reportRecords,
    routePlaceIds: payload.routePlaceIds || []
  });

  // 3. Schema definition for Gemini JSON generation
  const responseSchema = {
    type: "OBJECT",
    properties: {
      answer: { type: "STRING" },
      recommendedPlaceIds: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      itinerary: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          steps: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                placeId: { type: "STRING" },
                placeName: { type: "STRING" },
                note: { type: "STRING" },
                weatherContext: { type: "STRING" }
              },
              required: ["placeId", "placeName", "note"]
            }
          }
        },
        required: ["title", "steps"]
      },
      weatherObservation: { type: "STRING" },
      safetySummary: { type: "STRING" },
      affordabilityGuidance: { type: "STRING" }
    },
    required: ["answer", "recommendedPlaceIds"]
  };

  const ai = new GoogleGenAI({ apiKey });

  // Timeout wrapper
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const generatePromise = ai.models.generateContent({
    model: modelName,
    contents: [
      { role: "user", parts: [{ text: `${systemInstruction}\n\nContext and Request:\n${userPrompt}` }] }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as never,
      temperature: 0.2
    }
  });

  const response = await Promise.race([generatePromise, timeoutPromise]);
  const rawText = response.text || "";

  // 4. Parse and validate JSON structure
  let parsed: {
    answer: string;
    recommendedPlaceIds: string[];
    itinerary?: {
      title: string;
      steps: Array<{ placeId: string; placeName: string; note: string; weatherContext?: string }>;
    };
    weatherObservation?: string;
    safetySummary?: string;
    affordabilityGuidance?: string;
  };

  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Gemini returned malformed non-JSON output: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!parsed || typeof parsed.answer !== "string") {
    throw new Error("Gemini response missing required 'answer' string field");
  }

  // 5. Grounding check: enforce that recommended place IDs strictly match supplied places
  const validPlaceIdSet = new Set(places.map((p) => p.id));
  const filteredRecommendedIds = (parsed.recommendedPlaceIds || []).filter((id) =>
    validPlaceIdSet.has(id)
  );

  // 6. Build verified itinerary with code-calculated distances
  let verifiedItinerary: AssistantItinerary | undefined = undefined;
  if (parsed.itinerary && Array.isArray(parsed.itinerary.steps) && parsed.itinerary.steps.length > 0) {
    let prevCoords = center;
    let totalKm = 0;
    const verifiedSteps: ItineraryStep[] = [];

    for (const step of parsed.itinerary.steps) {
      const match = places.find((p) => p.id === step.placeId);
      if (!match) continue; // Skip fabricated place IDs

      const dist = Number(distanceKm(prevCoords, match.coordinates).toFixed(2));
      totalKm += dist;
      prevCoords = match.coordinates;

      verifiedSteps.push({
        placeId: match.id,
        placeName: match.name,
        category: match.category,
        distanceFromPrevKm: dist,
        note: step.note || match.description,
        weatherContext: step.weatherContext
      });
    }

    if (verifiedSteps.length > 0) {
      verifiedItinerary = {
        title: parsed.itinerary.title || `City Exploration Route for ${city}`,
        estimatedTotalKm: Number(totalKm.toFixed(2)),
        steps: verifiedSteps
      };
    }
  }

  return {
    answer: parsed.answer,
    source: "gemini",
    model: modelName,
    recommendedPlaceIds: filteredRecommendedIds,
    itinerary: verifiedItinerary,
    weatherObservation: parsed.weatherObservation,
    safetySummary: parsed.safetySummary,
    affordabilityGuidance: parsed.affordabilityGuidance,
    numericCalculations: numerics,
    disclaimer: DISCLAIMER_TEXT
  };
}
