import type { CitizenReport, Coordinates, Place } from "@/lib/types";

export const puneCenter: Coordinates = { lat: 18.5204, lng: 73.8567 };

export const demoPlaces: Place[] = [
  {
    id: "shaniwar-wada",
    providerId: "demo:shaniwar-wada",
    name: "Shaniwar Wada",
    category: "heritage",
    coordinates: { lat: 18.5195, lng: 73.8553 },
    area: "Kasba Peth",
    description: "Historic Maratha-era fortification and a strong first stop for Pune heritage context.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["history", "walkable", "landmark"],
    safetyNotes: ["Busy public landmark; check opening hours from official sources before visiting."]
  },
  {
    id: "aga-khan-palace",
    providerId: "demo:aga-khan-palace",
    name: "Aga Khan Palace",
    category: "heritage",
    coordinates: { lat: 18.5525, lng: 73.9015 },
    area: "Kalyani Nagar",
    description: "A major heritage site associated with India's freedom movement and museum visits.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["museum", "heritage", "gardens"],
    safetyNotes: ["Plan return transport in advance during late evening hours."]
  },
  {
    id: "fc-road-food",
    providerId: "demo:fc-road-food",
    name: "FC Road Food Walk",
    category: "food",
    coordinates: { lat: 18.5229, lng: 73.8416 },
    area: "Shivajinagar",
    description: "Dense student-friendly food stretch with cafes, snacks and late-evening footfall.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["street food", "cafes", "students"],
    safetyNotes: ["Crowding varies by evening and weekend; community reports are unverified."]
  },
  {
    id: "viman-nagar-hotels",
    providerId: "demo:viman-nagar-hotels",
    name: "Viman Nagar Stay Cluster",
    category: "hotel",
    coordinates: { lat: 18.5679, lng: 73.9143 },
    area: "Viman Nagar",
    description: "Airport-side stay and dining cluster useful for short business and transit trips.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["airport", "hotels", "dining"],
    safetyNotes: ["Hotel availability and prices are not live in this demo."]
  },
  {
    id: "sinhagad-fort",
    providerId: "demo:sinhagad-fort",
    name: "Sinhagad Fort",
    category: "attraction",
    coordinates: { lat: 18.3663, lng: 73.7559 },
    area: "Sinhagad Ghat",
    description: "Popular hill fort and day trip destination outside central Pune.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["trek", "fort", "views"],
    safetyNotes: ["Weather and road conditions should be checked from current sources before travel."]
  },
  {
    id: "jm-road-budget",
    providerId: "demo:jm-road-budget",
    name: "JM Road Budget Loop",
    category: "budget",
    coordinates: { lat: 18.5199, lng: 73.8452 },
    area: "Deccan Gymkhana",
    description: "Demo-only low-cost category example near central Pune colleges and transit.",
    source: "demo",
    sourceUrl: "demo:fallback",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { dataset: "CityPulse demo fallback" },
    tags: ["budget", "shopping", "snacks"],
    safetyNotes: ["No price data is live; budget label is demo guidance only."]
  }
];

export const demoReports: CitizenReport[] = [
  {
    id: "report-1",
    category: "congestion",
    title: "Heavy evening crowd",
    detail: "Community demo report: weekend food queues and footpath crowding around FC Road.",
    coordinates: { lat: 18.5236, lng: 73.8408 },
    area: "Shivajinagar",
    createdAt: "2026-10-08T16:30:00.000Z",
    status: "unverified",
    moderationStatus: "auto_reviewed",
    source: "demo_seed",
    evidence: "text",
    isSeeded: true
  },
  {
    id: "report-2",
    category: "poor_lighting",
    title: "Patchy lane lighting",
    detail: "Community demo report: one connecting lane was described as dim after dark.",
    coordinates: { lat: 18.5668, lng: 73.9128 },
    area: "Viman Nagar",
    createdAt: "2026-10-07T14:15:00.000Z",
    status: "unverified",
    moderationStatus: "auto_reviewed",
    source: "demo_seed",
    evidence: "text",
    isSeeded: true
  },
  {
    id: "report-3",
    category: "flooding",
    title: "Waterlogging after rain",
    detail: "Community demo report: temporary waterlogging mentioned near a junction.",
    coordinates: { lat: 18.519, lng: 73.8569 },
    area: "Kasba Peth",
    createdAt: "2026-10-06T10:05:00.000Z",
    status: "unverified",
    moderationStatus: "auto_reviewed",
    source: "demo_seed",
    evidence: "text",
    isSeeded: true
  }
];

export const incidentCategoryLabels: Record<string, string> = {
  accidents: "Accidents",
  poor_lighting: "Poor lighting",
  flooding: "Flooding",
  obstructions: "Obstructions",
  safety_concerns: "Safety concerns",
  cleanliness: "Cleanliness",
  congestion: "Congestion"
};

export const filterLabels: Record<string, string> = {
  food: "Food",
  attraction: "Attractions",
  heritage: "Heritage",
  hotel: "Hotels",
  budget: "Budget"
};

export function distanceKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}
