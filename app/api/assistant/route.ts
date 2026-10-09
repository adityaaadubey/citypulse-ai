import { NextResponse } from "next/server";
import {
  type AssistantRequestPayload,
  type AssistantResponse,
  generateDeterministicFallback,
  queryGeminiAssistant
} from "@/lib/server/assistant";

export const maxDuration = 25; // Maximum serverless execution time for Vercel

export async function POST(request: Request) {
  let body: AssistantRequestPayload;

  try {
    body = (await request.json()) as AssistantRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload in request." }, { status: 400 });
  }

  // 1. Validate inputs
  const rawQuestion = body.question;
  if (!rawQuestion || typeof rawQuestion !== "string" || !rawQuestion.trim()) {
    return NextResponse.json(
      { error: "A valid non-empty question string is required." },
      { status: 400 }
    );
  }

  const question = rawQuestion.trim().slice(0, 500); // Limit question length to 500 chars

  // Sanitize and limit places
  const places = Array.isArray(body.places)
    ? body.places.slice(0, 20).filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
    : [];

  // Sanitize and limit reports
  const reports = Array.isArray(body.reports)
    ? body.reports
        .slice(0, 15)
        .filter((r) => r && typeof r.id === "string" && r.coordinates && Number.isFinite(r.coordinates.lat))
    : [];

  const sanitizedPayload: AssistantRequestPayload = {
    question,
    city: typeof body.city === "string" ? body.city.slice(0, 80) : "Pune",
    cityCenter:
      body.cityCenter && Number.isFinite(body.cityCenter.lat) && Number.isFinite(body.cityCenter.lng)
        ? body.cityCenter
        : { lat: 18.5204, lng: 73.8567 },
    selectedPlaceId: typeof body.selectedPlaceId === "string" ? body.selectedPlaceId : undefined,
    places,
    weather: body.weather || null,
    reports,
    routePlaceIds: Array.isArray(body.routePlaceIds) ? body.routePlaceIds.slice(0, 5) : []
  };

  // 2. Read server-only secret environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey) {
    const fallbackResponse = generateDeterministicFallback(
      sanitizedPayload,
      "GEMINI_API_KEY is not configured on the server"
    );
    return NextResponse.json(fallbackResponse);
  }

  // 3. Query Gemini with resilient model fallback chain
  try {
    const geminiResponse = await queryGeminiAssistant(sanitizedPayload, apiKey, configuredModel, 11000);
    return NextResponse.json(geminiResponse);
  } catch (primaryError) {
    console.warn(`Primary Gemini model (${configuredModel}) failed:`, primaryError);

    // Try secondary fallback model if the primary was not gemini-3.8-flash
    const backupModel = configuredModel === "gemini-3.8-flash" ? "gemini-flash-latest" : "gemini-3.8-flash";
    try {
      console.log(`Attempting backup model: ${backupModel}`);
      const backupResponse = await queryGeminiAssistant(sanitizedPayload, apiKey, backupModel, 10000);
      return NextResponse.json(backupResponse);
    } catch (secondaryError) {
      console.warn(`Secondary Gemini model (${backupModel}) failed:`, secondaryError);

      const errorMessage =
        primaryError instanceof Error ? primaryError.message : "Gemini service unavailable";
      const fallbackResponse = generateDeterministicFallback(sanitizedPayload, errorMessage);
      return NextResponse.json(fallbackResponse);
    }
  }
}
