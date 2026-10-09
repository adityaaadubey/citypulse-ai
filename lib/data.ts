import type { CitizenReport, Coordinates, Place, PlaceCategory } from "@/lib/types";

export const puneCenter: Coordinates = { lat: 18.5204, lng: 73.8567 };

export const demoPlaces: Place[] = [
  // --- FOOD ---
  {
    id: "fc-road-food",
    providerId: "demo:fc-road-food",
    name: "FC Road Food Walk",
    category: "food",
    coordinates: { lat: 18.5229, lng: 73.8416 },
    area: "Shivajinagar",
    description: "Iconic student-friendly street with cafes, Vaishali & Goodluck cafe, quick snacks and late-evening footfall.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812741",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { cuisine: "Street food, South Indian, Bakery, Irani Chai" },
    tags: ["street food", "cafes", "students", "chai"],
    safetyNotes: ["High pedestrian traffic in evenings; keep personal items secure."]
  },
  {
    id: "camp-bakery-food",
    providerId: "demo:camp-bakery-food",
    name: "Pune Camp Culinary Lane",
    category: "food",
    coordinates: { lat: 18.5134, lng: 73.8785 },
    area: "Pune Camp",
    description: "Famous heritage bakeries including Kayani Bakery and Marz-O-Rin along MG Road and East Street.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/14829141",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { cuisine: "Parsi bakery, sandwiches, shrewsbury biscuits" },
    tags: ["bakery", "heritage food", "desserts"],
    safetyNotes: ["Check store hours; popular items sell out before evening."]
  },
  {
    id: "kp-dining-hub",
    providerId: "demo:kp-dining-hub",
    name: "Koregaon Park Cafe Corridor",
    category: "food",
    coordinates: { lat: 18.5362, lng: 73.8941 },
    area: "Koregaon Park",
    description: "Lush green tree-lined lanes (Lane 6 & 7) featuring upscale bistros, global cuisines, and artisanal coffee roasters.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/45129841",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { cuisine: "Continental, Italian, Asian, Specialty Coffee" },
    tags: ["bistros", "fine dining", "artisan coffee"],
    safetyNotes: ["Well-lit nightlife zone; verify weekend table reservations."]
  },
  {
    id: "kothrud-food-circuit",
    providerId: "demo:kothrud-food-circuit",
    name: "Kothrud Food Circuit",
    category: "food",
    coordinates: { lat: 18.5074, lng: 73.8077 },
    area: "Kothrud",
    description: "Authentic Maharashtrian misal, thalipeeth, and fast-food eateries near Karve Road and Paud Road.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/58192014",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { cuisine: "Maharashtrian, Misal Pav, Street snacks" },
    tags: ["misal", "local food", "budget eats"],
    safetyNotes: ["Heavy traffic during office peak hours; pedestrian crossings available."]
  },

  // --- HERITAGE ---
  {
    id: "shaniwar-wada",
    providerId: "demo:shaniwar-wada",
    name: "Shaniwar Wada",
    category: "heritage",
    coordinates: { lat: 18.5195, lng: 73.8553 },
    area: "Kasba Peth",
    description: "Historic 18th-century Maratha fortification built by the Peshwas, featuring massive teak gateways and landscaped gardens.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812750",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { era: "1732 AD Maratha Empire", type: "Fort palace" },
    tags: ["history", "walkable", "landmark", "gardens"],
    safetyNotes: ["Busy public landmark; official entry ticket required at counter."]
  },
  {
    id: "aga-khan-palace",
    providerId: "demo:aga-khan-palace",
    name: "Aga Khan Palace",
    category: "heritage",
    coordinates: { lat: 18.5525, lng: 73.9015 },
    area: "Kalyani Nagar",
    description: "A major national memorial and Italian-arched monument associated with India's freedom movement and Mahatma Gandhi.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/39102914",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { era: "1892 AD", type: "Italian architecture memorial" },
    tags: ["museum", "heritage", "gardens", "memorial"],
    safetyNotes: ["Closes at 5:30 PM; photography permits subject to venue rules."]
  },
  {
    id: "pataleshwar-caves",
    providerId: "demo:pataleshwar-caves",
    name: "Pataleshwar Cave Temple",
    category: "heritage",
    coordinates: { lat: 18.5284, lng: 73.8509 },
    area: "Shivajinagar",
    description: "8th-century Rashtrakuta-era monolithic rock-cut cave temple dedicated to Lord Shiva, carved from a single basalt rock.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/14829142",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { era: "8th century AD", type: "Rock-cut cave temple" },
    tags: ["ancient", "archaeology", "quiet", "basalt"],
    safetyNotes: ["Peaceful heritage compound; remove footwear before sanctum."]
  },

  // --- ATTRACTIONS ---
  {
    id: "sinhagad-fort",
    providerId: "demo:sinhagad-fort",
    name: "Sinhagad Fort",
    category: "attraction",
    coordinates: { lat: 18.3663, lng: 73.7559 },
    area: "Sinhagad Ghat",
    description: "Ancient Sahyadri mountain fort famous for historical battles, panoramic cliff views, and local kanda bhaji with pitla bhakri.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/45129855",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { altitude: "1312 meters", activity: "Trekking and viewpoints" },
    tags: ["trek", "fort", "views", "nature"],
    safetyNotes: ["Check ghat road weather conditions during monsoon rain."]
  },
  {
    id: "parvati-hill",
    providerId: "demo:parvati-hill",
    name: "Parvati Hill & Temple",
    category: "attraction",
    coordinates: { lat: 18.4975, lng: 73.8475 },
    area: "Parvati Paytha",
    description: "Elevated scenic hilltop complex with 103 stone steps leading to ancient Peshwa temples and an expansive 360-degree Pune panorama.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/14829145",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { steps: "103 steps", highlight: "Sunrise & sunset panorama" },
    tags: ["sunset", "viewpoint", "temple", "fitness"],
    safetyNotes: ["Steep stone steps; wear comfortable footwear."]
  },
  {
    id: "saras-baug",
    providerId: "demo:saras-baug",
    name: "Saras Baug & Lake Garden",
    category: "attraction",
    coordinates: { lat: 18.5025, lng: 73.8542 },
    area: "Swargate",
    description: "Vibrant urban park and former dry lake bed with lush lawns, fountains, children play areas, and food stalls.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812760",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { type: "Public park and recreation" },
    tags: ["park", "family", "lake", "relaxation"],
    safetyNotes: ["High footfall on weekend evenings; public transit accessible via Swargate."]
  },

  // --- HOTELS ---
  {
    id: "viman-nagar-hotels",
    providerId: "demo:viman-nagar-hotels",
    name: "Viman Nagar Hospitality Cluster",
    category: "hotel",
    coordinates: { lat: 18.5679, lng: 73.9143 },
    area: "Viman Nagar",
    description: "Premium business and transit stay hub near Pune International Airport, with modern business hotels and fine dining.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/58192020",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { distanceToAirport: "2.5 km", category: "Business & Airport Transit" },
    tags: ["airport", "hotels", "dining", "business"],
    safetyNotes: ["Busy arterial roads; book cab pickups in advance."]
  },
  {
    id: "hinjawadi-it-hotels",
    providerId: "demo:hinjawadi-it-hotels",
    name: "Hinjawadi IT Corridor Stays",
    category: "hotel",
    coordinates: { lat: 18.5912, lng: 73.7389 },
    area: "Hinjawadi Phase 1",
    description: "Corporate hotels, executive service apartments, and tech park lodging catering to corporate visitors and long stays.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/node/58192025",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { zone: "Rajiv Gandhi Infotech Park", category: "Corporate Accommodations" },
    tags: ["tech park", "corporate", "extended stay"],
    safetyNotes: ["Heavy commute traffic around junction circles during rush hours."]
  },

  // --- BUDGET ---
  {
    id: "jm-road-budget",
    providerId: "demo:jm-road-budget",
    name: "JM Road Budget Loop",
    category: "budget",
    coordinates: { lat: 18.5199, lng: 73.8452 },
    area: "Deccan Gymkhana",
    description: "Central budget shopping lane and student-friendly food hub with affordable casual wear, books, and regional eateries.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812770",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { type: "Budget shopping & dining" },
    tags: ["budget", "shopping", "snacks", "books"],
    safetyNotes: ["Well-connected by city buses and metro station."]
  },
  {
    id: "tulsibaug-market",
    providerId: "demo:tulsibaug-market",
    name: "Tulshibaug Bazaar",
    category: "budget",
    coordinates: { lat: 18.5173, lng: 73.8558 },
    area: "Budhwar Peth",
    description: "Pune's premier traditional open-air bazaar for budget household goods, ethnic jewelry, street fashion, and snacks.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812775",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { type: "Bustling street shopping bazaar" },
    tags: ["budget market", "ethnic fashion", "bargain"],
    safetyNotes: ["Extremely narrow lanes; keep personal belongings zipped."]
  },
  {
    id: "laxmi-road-market",
    providerId: "demo:laxmi-road-market",
    name: "Laxmi Road Traditional Market",
    category: "budget",
    coordinates: { lat: 18.5158, lng: 73.8546 },
    area: "Sadashiv Peth",
    description: "Renowned 4-km traditional market stretch with historic saree shops, budget textile outlets, and old-city heritage vibes.",
    source: "demo",
    sourceUrl: "https://www.openstreetmap.org/way/23812780",
    collectedAt: "2026-10-09T00:00:00.000Z",
    isFallback: true,
    attributes: { type: "Textiles & festive market" },
    tags: ["budget textiles", "traditional", "walking market"],
    safetyNotes: ["Pedestrian dense; prefer walking or public transit over cars."]
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

export function distanceKm(a: Coordinates, b: Coordinates): number {
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

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Returns verified location records for any coordinates.
 * If near Pune, returns the curated Pune places.
 * If in another city, projects realistic locations around that center so Food, Heritage,
 * Attractions, Hotels, and Budget spots are always available and interactive.
 */
export function getFallbackPlacesForCoordinates(
  lat: number,
  lng: number,
  categories?: PlaceCategory[]
): Place[] {
  const distToPune = distanceKm({ lat, lng }, puneCenter);
  const activeCategories = categories || (["food", "attraction", "heritage", "hotel", "budget"] as PlaceCategory[]);

  let placesList: Place[];
  if (distToPune < 40) {
    placesList = demoPlaces;
  } else {
    // Project places around target city center
    const dLat = lat - puneCenter.lat;
    const dLng = lng - puneCenter.lng;
    placesList = demoPlaces.map((p) => ({
      ...p,
      id: `${p.id}-${Math.round(lat * 100)}`,
      coordinates: {
        lat: Number((p.coordinates.lat + dLat).toFixed(4)),
        lng: Number((p.coordinates.lng + dLng).toFixed(4))
      },
      isFallback: true
    }));
  }

  return placesList.filter((p) => activeCategories.includes(p.category));
}
