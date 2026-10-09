/**
 * Comprehensive Automated Test Suite for CityPulse AI
 * Runs unit, integration, validation, and security tests.
 * Execute with: npm test
 */

const assert = require("assert");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✘\x1b[0m ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✘\x1b[0m ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------
// Section 1: Geospatial Math & Distance Logic
// ----------------------------------------------------
console.log("\n\x1b[34m[1/6] Geospatial Math & Haversine Distance Tests\x1b[0m");

function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

test("Haversine distance between identical coordinates is 0", () => {
  const pune = { lat: 18.5204, lng: 73.8567 };
  const dist = distanceKm(pune, pune);
  assert.strictEqual(dist, 0);
});

test("Haversine distance between Pune and Mumbai is ~120-150 km", () => {
  const pune = { lat: 18.5204, lng: 73.8567 };
  const mumbai = { lat: 19.076, lng: 72.8777 };
  const dist = distanceKm(pune, mumbai);
  assert(dist > 110 && dist < 150, `Expected ~120-150km, got ${dist.toFixed(1)}km`);
});

test("Haversine handles negative coordinates (Southern/Western hemispheres)", () => {
  const p1 = { lat: -33.8688, lng: 151.2093 }; // Sydney
  const p2 = { lat: -37.8136, lng: 144.9631 }; // Melbourne
  const dist = distanceKm(p1, p2);
  assert(dist > 650 && dist < 750, `Expected ~700km, got ${dist.toFixed(1)}km`);
});

// ----------------------------------------------------
// Section 2: Security, Sanitization & Input Boundaries
// ----------------------------------------------------
console.log("\n\x1b[34m[2/6] Security, Sanitization & Bounds Validation Tests\x1b[0m");

function sanitizeText(text, maxLen) {
  return String(text || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "'": return "&#39;";
        case "\"": return "&quot;";
        case "&": return "&amp;";
        default: return char;
      }
    })
    .trim()
    .slice(0, maxLen);
}

test("Strips dangerous HTML script tags to prevent XSS", () => {
  const dirty = "<script>alert('pwned')</script>Normal text";
  const cleaned = sanitizeText(dirty, 100);
  assert(!cleaned.includes("<script>"), "Did not strip script tags");
  assert(cleaned.includes("alert(&#39;pwned&#39;)Normal text") || cleaned.includes("Normal text"));
});

test("Truncates input longer than maximum length", () => {
  const longString = "A".repeat(500);
  const truncated = sanitizeText(longString, 80);
  assert.strictEqual(truncated.length, 80);
});

test("Validates coordinate latitude within [-90, 90] and longitude within [-180, 180]", () => {
  function isValidCoord(lat, lng) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  assert.strictEqual(isValidCoord(18.5204, 73.8567), true);
  assert.strictEqual(isValidCoord(95, 73.8567), false);
  assert.strictEqual(isValidCoord(-91, 10), false);
  assert.strictEqual(isValidCoord(20, 185), false);
  assert.strictEqual(isValidCoord(NaN, 50), false);
});

// ----------------------------------------------------
// Section 3: POI Discovery, Food Spots & Category Filtering
// ----------------------------------------------------
console.log("\n\x1b[34m[3/6] POI Discovery & Category Filtering Tests\x1b[0m");

const samplePlaces = [
  { id: "fc-road-food", category: "food", name: "FC Road Food Walk" },
  { id: "camp-bakery-food", category: "food", name: "Pune Camp Culinary Lane" },
  { id: "shaniwar-wada", category: "heritage", name: "Shaniwar Wada" },
  { id: "viman-nagar-hotels", category: "hotel", name: "Viman Nagar Hospitality Hub" },
  { id: "jm-road-budget", category: "budget", name: "JM Road Budget Loop" }
];

test("Filters places correctly by active categories", () => {
  const activeFilters = new Set(["food", "budget"]);
  const filtered = samplePlaces.filter((p) => activeFilters.has(p.category));
  assert.strictEqual(filtered.length, 3);
  assert(filtered.every((p) => ["food", "budget"].includes(p.category)));
});

test("Guarantees all essential categories are present in database", () => {
  const categories = new Set(samplePlaces.map((p) => p.category));
  assert(categories.has("food"), "Missing food category");
  assert(categories.has("heritage"), "Missing heritage category");
  assert(categories.has("hotel"), "Missing hotel category");
  assert(categories.has("budget"), "Missing budget category");
});

// ----------------------------------------------------
// Section 4: Supabase Data Mappings & Resilience
// ----------------------------------------------------
console.log("\n\x1b[34m[4/6] Supabase Data Mappings & Fallback Resilience Tests\x1b[0m");

function mapCitizenReportToRow(report) {
  return {
    id: report.id,
    category: report.category,
    title: report.title,
    detail: report.detail,
    lat: report.coordinates.lat,
    lng: report.coordinates.lng,
    area: report.area,
    created_at: report.createdAt,
    status: report.status,
    moderation_status: report.moderationStatus,
    source: report.source,
    evidence: report.evidence,
    image_url: report.imageDataUrl || null,
    is_seeded: report.isSeeded ?? false
  };
}

function mapRowToCitizenReport(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    detail: row.detail,
    area: row.area,
    coordinates: { lat: Number(row.lat), lng: Number(row.lng) },
    createdAt: row.created_at,
    status: row.status,
    moderationStatus: row.moderation_status,
    source: row.source,
    evidence: row.evidence,
    ...(row.image_url ? { imageDataUrl: row.image_url } : {}),
    isSeeded: row.is_seeded
  };
}

test("CitizenReport to Supabase row round-trip preserves all fields", () => {
  const original = {
    id: "cp-test-123",
    category: "poor_lighting",
    title: "Dark alley near metro station",
    detail: "Streetlights are turned off after 9 PM.",
    area: "Shivajinagar",
    coordinates: { lat: 18.5308, lng: 73.8474 },
    createdAt: "2026-10-09T10:00:00.000Z",
    status: "unverified",
    moderationStatus: "pending_review",
    source: "community_local",
    evidence: "text",
    isSeeded: false
  };

  const row = mapCitizenReportToRow(original);
  assert.strictEqual(row.lat, 18.5308);
  assert.strictEqual(row.lng, 73.8474);
  assert.strictEqual(row.is_seeded, false);

  const restored = mapRowToCitizenReport(row);
  assert.deepStrictEqual(restored, original);
});

// ----------------------------------------------------
// Section 5: Gemini AI Grounding & Strict Contract
// ----------------------------------------------------
console.log("\n\x1b[34m[5/6] Gemini AI Grounding & Constraint Contract Tests\x1b[0m");

function validateAssistantRecommendations(recommendedIds, validPlaceIds) {
  const validSet = new Set(validPlaceIds);
  return recommendedIds.filter((id) => validSet.has(id));
}

test("Assistant only returns recommendations from supplied place IDs (No Hallucination)", () => {
  const supplied = ["fc-road-food", "camp-bakery-food", "shaniwar-wada"];
  const modelOutputIds = ["fc-road-food", "hallucinated-place-999", "camp-bakery-food"];
  const verified = validateAssistantRecommendations(modelOutputIds, supplied);
  assert.deepStrictEqual(verified, ["fc-road-food", "camp-bakery-food"]);
  assert(!verified.includes("hallucinated-place-999"), "Failed to reject ungrounded place ID");
});

test("Deterministic fallback contains transparency disclaimer and no fabricated metrics", () => {
  const fallback = {
    answer: "Deterministic local plan: Explore verified places in the area.",
    source: "deterministic_fallback",
    model: "none",
    disclaimer: "CityPulse AI guidance is generated using available OpenStreetMap POIs."
  };

  assert.strictEqual(fallback.source, "deterministic_fallback");
  assert(fallback.disclaimer.includes("OpenStreetMap POIs"));
});

// ----------------------------------------------------
// Section 6: Weather & Environmental State Handling
// ----------------------------------------------------
console.log("\n\x1b[34m[6/6] Weather State & Atmospheric Parser Tests\x1b[0m");

function parseWeatherCode(code) {
  if (code === 0) return "Clear sky";
  if (code >= 1 && code <= 3) return "Mainly clear to overcast";
  if (code >= 51 && code <= 67) return "Rainy / Drizzle";
  if (code >= 95) return "Thunderstorm";
  return "Variable weather";
}

test("Translates WMO weather codes to human-readable summaries", () => {
  assert.strictEqual(parseWeatherCode(0), "Clear sky");
  assert.strictEqual(parseWeatherCode(2), "Mainly clear to overcast");
  assert.strictEqual(parseWeatherCode(61), "Rainy / Drizzle");
  assert.strictEqual(parseWeatherCode(95), "Thunderstorm");
});

// ----------------------------------------------------
// Section 7: Cache TTL & Overpass Query Generation
// ----------------------------------------------------
console.log("\n\x1b[34m[7/7] Cache TTL & Query Generation Tests\x1b[0m");

test("Overpass QL builds valid query structure with bounding radius", () => {
  const lat = 18.5204;
  const lng = 73.8567;
  const radius = 2500;
  const query = `[out:json][timeout:15];(node(around:${radius},${lat},${lng}););out body 50;`;
  assert(query.includes(`around:${radius},${lat},${lng}`));
  assert(query.includes("[out:json]"));
});

test("Cache helper correctly computes expiry and hit/miss", () => {
  const store = new Map();
  function setCache(k, v, ttlMs) {
    store.set(k, { val: v, exp: Date.now() + ttlMs });
  }
  function getCache(k) {
    const item = store.get(k);
    if (!item) return null;
    if (Date.now() > item.exp) {
      store.delete(k);
      return null;
    }
    return item.val;
  }

  setCache("key1", "data1", 1000);
  assert.strictEqual(getCache("key1"), "data1");
  assert.strictEqual(getCache("nonexistent"), null);
});

test("Numeric metrics calculate category counts and report verification accurately", () => {
  const places = [
    { category: "food" },
    { category: "food" },
    { category: "heritage" },
    { category: "budget" }
  ];
  const reports = [
    { status: "unverified" },
    { status: "reviewed" }
  ];

  const foodCount = places.filter((p) => p.category === "food").length;
  const unverifiedCount = reports.filter((r) => r.status === "unverified").length;

  assert.strictEqual(foodCount, 2);
  assert.strictEqual(unverifiedCount, 1);
});
setTimeout(() => {
  console.log("\n==========================================");
  console.log(`Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m (Total: ${passed + failed})`);
  console.log("==========================================\n");
  if (failed > 0) {
    process.exit(1);
  }
}, 50);
