import type { Place, PlaceCategory } from "@/lib/types";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
  timestamp?: string;
};

const categoryQueries: Record<PlaceCategory, string[]> = {
  food: [
    'node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]',
    'way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]',
    'relation["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]'
  ],
  attraction: [
    'node["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery)$"]',
    'way["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery)$"]',
    'relation["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery)$"]'
  ],
  heritage: [
    'node["historic"]',
    'way["historic"]',
    'relation["historic"]',
    'node["heritage"]',
    'way["heritage"]',
    'relation["heritage"]'
  ],
  hotel: [
    'node["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]',
    'way["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]',
    'relation["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]'
  ],
  budget: [
    'node["amenity"~"^(fast_food|marketplace|drinking_water)$"]',
    'way["amenity"~"^(fast_food|marketplace|drinking_water)$"]',
    'relation["amenity"~"^(fast_food|marketplace|drinking_water)$"]'
  ]
};

const categoryPriority: PlaceCategory[] = ["heritage", "hotel", "attraction", "food", "budget"];

export function buildOverpassQuery(lat: number, lng: number, radiusMeters: number, categories: PlaceCategory[]) {
  const clauses = categories
    .flatMap((category) => categoryQueries[category])
    .map((clause) => `${clause}(around:${radiusMeters},${lat},${lng});`)
    .join("\n");

  return `
    [out:json][timeout:12];
    (
      ${clauses}
    );
    out tags center 80;
  `;
}

export function normalizeOverpassElements(elements: OverpassElement[], fetchedAt: string): Place[] {
  const seen = new Set<string>();

  return elements
    .map((element) => normalizeElement(element, fetchedAt))
    .filter((place): place is Place => Boolean(place))
    .filter((place) => {
      const key = `${place.name.toLowerCase()}-${place.coordinates.lat.toFixed(4)}-${place.coordinates.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}

function normalizeElement(element: OverpassElement, fetchedAt: string): Place | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const name = tags.name || tags["name:en"];

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const category = getCategory(tags);
  const osmType = element.type;
  const sourceUrl = `https://www.openstreetmap.org/${osmType}/${element.id}`;
  const readableType = tags.tourism || tags.amenity || tags.historic || tags.shop || "place";
  const area = [tags["addr:suburb"], tags["addr:neighbourhood"], tags["addr:city"]].filter(Boolean).join(", ");
  const attributes = Object.fromEntries(
    Object.entries(tags)
      .filter(([key]) => !["name", "name:en"].includes(key))
      .slice(0, 18)
  );

  return {
    id: `osm-${osmType}-${element.id}`,
    providerId: `${osmType}/${element.id}`,
    name,
    category,
    coordinates: { lat: Number(lat), lng: Number(lng) },
    area: area || "Area not specified in OpenStreetMap",
    description: `OpenStreetMap lists this as ${humanize(readableType)}. Opening hours, ratings, prices and accessibility are only shown if source data provides them; this MVP does not infer them.`,
    source: "OpenStreetMap Overpass",
    sourceUrl,
    collectedAt: element.timestamp ?? fetchedAt,
    isFallback: false,
    attributes,
    tags: buildTags(tags),
    safetyNotes: ["This POI is public map data, not a safety signal.", "Community reports nearby are unverified and should be interpreted cautiously."]
  };
}

function getCategory(tags: Record<string, string>): PlaceCategory {
  for (const category of categoryPriority) {
    if (categoryMatches(category, tags)) return category;
  }
  return "attraction";
}

function categoryMatches(category: PlaceCategory, tags: Record<string, string>) {
  if (category === "food") return ["restaurant", "cafe", "fast_food", "food_court"].includes(tags.amenity);
  if (category === "hotel") return ["hotel", "hostel", "guest_house", "motel", "apartment"].includes(tags.tourism);
  if (category === "heritage") return Boolean(tags.historic || tags.heritage);
  if (category === "budget") return ["fast_food", "marketplace", "drinking_water"].includes(tags.amenity);
  return Boolean(tags.tourism || tags.leisure);
}

function buildTags(tags: Record<string, string>) {
  return [tags.tourism, tags.amenity, tags.historic, tags.cuisine, tags.shop, tags["addr:city"]]
    .filter(Boolean)
    .map((tag) => humanize(tag))
    .slice(0, 5);
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}
