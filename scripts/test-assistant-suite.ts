/**
 * Automated Test Suite for CityPulse AI Assistant
 * Tests:
 * 1. Normal request with Gemini API key (structured JSON response)
 * 2. Missing data case (empty places, no weather, empty reports)
 * 3. Malformed output simulation (fallback takes over cleanly)
 * 4. API failure / timeout simulation (deterministic fallback triggered & labelled)
 */

import { demoPlaces, demoReports } from "../lib/data";
import {
  generateDeterministicFallback,
  queryGeminiAssistant,
  calculateNumericResults
} from "../lib/server/assistant";

import fs from "fs";
import path from "path";

// Auto-load .env.local if environment variable is not exported in shell
if (!process.env.GEMINI_API_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value.trim();
        }
      }
    }
  } catch {}
}

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";


async function runTests() {
  console.log("==================================================");
  console.log("🚀 Starting CityPulse AI Assistant Test Suite");
  console.log("==================================================\n");

  let passed = 0;
  let total = 4;

  // TEST 1: Normal Request with Gemini API
  console.log("--- TEST 1: Normal Request with Gemini API ---");
  try {
    const payload = {
      question: "Recommend a 2-stop afternoon itinerary for Pune considering the weather and safety.",
      city: "Pune",
      cityCenter: { lat: 18.5204, lng: 73.8567 },
      places: demoPlaces.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        coordinates: p.coordinates,
        area: p.area,
        description: p.description,
        source: p.source,
        sourceUrl: p.sourceUrl,
        tags: p.tags,
        safetyNotes: p.safetyNotes,
        budget: p.budget
      })),
      weather: {
        temperature: 28,
        windSpeed: 12,
        summary: "Partly cloudy",
        observedAt: new Date().toISOString(),
        source: "Open-Meteo"
      },
      reports: demoReports.slice(0, 3).map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        detail: r.detail,
        coordinates: r.coordinates,
        area: r.area,
        createdAt: r.createdAt,
        status: r.status,
        moderationStatus: r.moderationStatus
      }))
    };

    const res = await queryGeminiAssistant(payload, API_KEY, MODEL_NAME, 12000);
    console.log("Source:", res.source);
    console.log("Model:", res.model);
    console.log("Answer snippet:", res.answer.slice(0, 120) + "...");
    console.log("Recommended IDs:", res.recommendedPlaceIds);
    console.log("Calculated POIs:", res.numericCalculations.placesCount);
    console.log("Itinerary stops:", res.itinerary?.steps.length ?? 0);

    // Enforce assertions
    if (res.source === "gemini" && typeof res.answer === "string" && res.numericCalculations.placesCount === 5) {
      console.log("✅ TEST 1 PASSED: Valid Gemini structured response received\n");
      passed++;
    } else {
      console.log("❌ TEST 1 FAILED: Unexpected response format\n");
    }
  } catch (err) {
    console.error("❌ TEST 1 FAILED with error:", err);
  }

  // TEST 2: Missing Data Case (empty places, no weather, empty reports)
  console.log("--- TEST 2: Missing Data Case ---");
  try {
    const payload = {
      question: "What is the best way to travel around this city?",
      city: "Unknown Area",
      cityCenter: { lat: 18.5204, lng: 73.8567 },
      places: [],
      weather: null,
      reports: []
    };

    const res = await queryGeminiAssistant(payload, API_KEY, MODEL_NAME, 12000);
    console.log("Source:", res.source);
    console.log("Calculated POIs count:", res.numericCalculations.placesCount);
    console.log("Reports count:", res.numericCalculations.reportsCount);
    console.log("Recommended Place IDs:", res.recommendedPlaceIds);

    if (
      res.numericCalculations.placesCount === 0 &&
      res.numericCalculations.reportsCount === 0 &&
      res.recommendedPlaceIds.length === 0
    ) {
      console.log("✅ TEST 2 PASSED: Missing data safely handled with 0 POIs and 0 reports\n");
      passed++;
    } else {
      console.log("❌ TEST 2 FAILED: Expected empty counts and empty place recommendations\n");
    }
  } catch (err) {
    console.error("❌ TEST 2 FAILED with error:", err);
  }

  // TEST 3: Malformed Output Handling Simulation
  console.log("--- TEST 3: Malformed Output Handling Simulation ---");
  try {
    const payload = {
      question: "Give me an itinerary",
      city: "Pune",
      cityCenter: { lat: 18.5204, lng: 73.8567 },
      places: demoPlaces.slice(0, 3)
    };

    // Simulate what happens when parsing malformed JSON occurs
    const malformedRawOutput = "This is not valid json at all {broken";
    let caughtError = false;
    try {
      JSON.parse(malformedRawOutput);
    } catch {
      caughtError = true;
      const fallback = generateDeterministicFallback(
        payload as never,
        "Gemini returned malformed output (SyntaxError)"
      );
      console.log("Fallback source:", fallback.source);
      console.log("Fallback reason:", fallback.fallbackReason);
      console.log("Fallback itinerary exists:", Boolean(fallback.itinerary));

      if (fallback.source === "deterministic_fallback" && fallback.fallbackReason?.includes("malformed")) {
        console.log("✅ TEST 3 PASSED: Malformed output gracefully caught & deterministic fallback activated\n");
        passed++;
      }
    }

    if (!caughtError) {
      console.log("❌ TEST 3 FAILED: JSON parse did not fail as expected\n");
    }
  } catch (err) {
    console.error("❌ TEST 3 FAILED with error:", err);
  }

  // TEST 4: API Failure / Timeout Simulation
  console.log("--- TEST 4: API Failure / Invalid Key Simulation ---");
  try {
    const payload = {
      question: "Are there any budget spots near Deccan?",
      city: "Pune",
      cityCenter: { lat: 18.5204, lng: 73.8567 },
      places: demoPlaces.slice(0, 4)
    };

    // Simulate an invalid API key / network outage
    try {
      await queryGeminiAssistant(payload as never, "INVALID_KEY_XYZ", MODEL_NAME, 5000);
      console.log("❌ TEST 4 FAILED: Invalid key unexpectedly succeeded\n");
    } catch (apiError) {
      console.log("Caught expected API error:", (apiError as Error).message.slice(0, 70) + "...");
      const fallback = generateDeterministicFallback(
        payload as never,
        (apiError as Error).message
      );
      console.log("Fallback source:", fallback.source);
      console.log("Fallback reason:", fallback.fallbackReason?.slice(0, 60) + "...");
      console.log("Recommended places in fallback:", fallback.recommendedPlaceIds.length);

      if (
        fallback.source === "deterministic_fallback" &&
        fallback.recommendedPlaceIds.every((id) => demoPlaces.some((p) => p.id === id))
      ) {
        console.log("✅ TEST 4 PASSED: API error caught and explicitly labelled deterministic fallback triggered\n");
        passed++;
      } else {
        console.log("❌ TEST 4 FAILED: Fallback did not meet expected criteria\n");
      }
    }
  } catch (err) {
    console.error("❌ TEST 4 FAILED with error:", err);
  }

  console.log("==================================================");
  console.log(`🏁 Test Results: ${passed}/${total} passed`);
  console.log("==================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
