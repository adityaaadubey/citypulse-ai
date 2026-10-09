export type Coordinates = {
  lat: number;
  lng: number;
};

export type PlaceCategory = "food" | "attraction" | "heritage" | "hotel" | "budget";

export type PlaceSource = "OpenStreetMap Overpass" | "demo";

export type IncidentCategory =
  | "accidents"
  | "poor_lighting"
  | "flooding"
  | "obstructions"
  | "safety_concerns"
  | "cleanliness"
  | "congestion";

export type ModerationStatus = "pending_review" | "auto_reviewed" | "verified" | "rejected";

export type Place = {
  id: string;
  providerId: string;
  name: string;
  category: PlaceCategory;
  coordinates: Coordinates;
  area: string;
  description: string;
  source: PlaceSource;
  sourceUrl: string;
  collectedAt: string;
  isFallback: boolean;
  attributes: Record<string, string>;
  budget?: "low" | "medium" | "high";
  tags: string[];
  safetyNotes: string[];
};

export type CitizenReport = {
  id: string;
  category: IncidentCategory;
  title: string;
  detail: string;
  coordinates: Coordinates;
  area: string;
  createdAt: string;
  status: "unverified" | "reviewed";
  moderationStatus: ModerationStatus;
  source: "community_local" | "demo_seed";
  evidence: "text" | "text_image";
  imageDataUrl?: string;
  isSeeded: boolean;
};

export type WeatherState = {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  summary: string;
  observedAt: string;
  source: string;
  fetchedAt: string;
};

export type CitySearchResult = {
  id: string;
  name: string;
  displayName: string;
  coordinates: Coordinates;
  boundingBox?: [number, number, number, number];
  source: string;
  fetchedAt: string;
};

export type PlacesResponse = {
  places: Place[];
  source: "OpenStreetMap Overpass";
  attribution: string;
  fetchedAt: string;
  cached: boolean;
  query: {
    lat: number;
    lng: number;
    radiusMeters: number;
    categories: PlaceCategory[];
  };
  warning?: string;
};
