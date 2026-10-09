"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { demoPlaces, demoReports, distanceKm, filterLabels, incidentCategoryLabels, puneCenter } from "@/lib/data";
import type {
  AssistantResponse,
  CitizenReport,
  CitySearchResult,
  Coordinates,
  IncidentCategory,
  Place,
  PlaceCategory,
  PlacesResponse,
  WeatherState
} from "@/lib/types";

const CityMap = dynamic(() => import("@/components/CityMap"), {
  ssr: false,
  loading: () => <div className="grid min-h-[420px] place-items-center rounded-lg bg-slate-100 text-sm text-slate-600">Loading map...</div>
});

const filters: PlaceCategory[] = ["food", "attraction", "heritage", "hotel", "budget"];
const incidentCategories = Object.keys(incidentCategoryLabels) as IncidentCategory[];
const localReportsKey = "citypulse:community-reports:v1";
type LoadState = "idle" | "loading" | "ready" | "empty" | "error";

export default function LiveCityPulseDashboard() {
  const [city, setCity] = useState("Pune");
  const [cityCenter, setCityCenter] = useState<Coordinates>(puneCenter);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searchState, setSearchState] = useState<LoadState>("idle");
  const [searchError, setSearchError] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<PlaceCategory>>(new Set(filters));
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesState, setPlacesState] = useState<LoadState>("loading");
  const [placesError, setPlacesError] = useState("");
  const [placesMeta, setPlacesMeta] = useState<Pick<PlacesResponse, "source" | "attribution" | "fetchedAt" | "cached" | "warning"> | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [reports, setReports] = useState<CitizenReport[]>(demoReports);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [activeReportCategories, setActiveReportCategories] = useState<Set<IncidentCategory>>(new Set(incidentCategories));
  const [reportStatus, setReportStatus] = useState<"idle" | "success" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");
  const [showSafetyLayer, setShowSafetyLayer] = useState(true);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherState, setWeatherState] = useState<LoadState>("loading");
  const [weatherError, setWeatherError] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask about itineraries, weather-aware routes, budget spots, or route comparisons.");
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [assistantState, setAssistantState] = useState<"idle" | "loading" | "error">("idle");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [reportDraft, setReportDraft] = useState({
    category: "safety_concerns" as CitizenReport["category"],
    title: "",
    detail: "",
    area: "Pune",
    precision: "approximate",
    observedTime: new Date().toISOString().slice(0, 16),
    imageDataUrl: ""
  });

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? places[0] ?? null,
    [places, selectedPlaceId]
  );

  const loadPlaces = useCallback(async () => {
    setPlacesState("loading");
    setPlacesError("");
    setPlacesMeta(null);
    setUsingFallbackData(false);
    try {
      const params = new URLSearchParams({
        lat: String(cityCenter.lat),
        lng: String(cityCenter.lng),
        radius: "3500",
        categories: filters.join(",")
      });
      const response = await fetch(`/api/places?${params.toString()}`);
      const data = (await response.json()) as PlacesResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error || "Live POI lookup failed." : "Live POI lookup failed.");
      }
      if (!("places" in data)) {
        throw new Error("Live POI lookup returned an unexpected response.");
      }

      setPlaces(data.places);
      setPlacesMeta({
        source: data.source,
        attribution: data.attribution,
        fetchedAt: data.fetchedAt,
        cached: data.cached,
        warning: data.warning
      });
      setPlacesState(data.places.length ? "ready" : "empty");
      setSelectedPlaceId(data.places[0]?.id ?? null);
      setCompareA(data.places[0]?.id ?? "");
      setCompareB(data.places[1]?.id ?? data.places[0]?.id ?? "");
    } catch (error) {
      setPlaces([]);
      setSelectedPlaceId(null);
      setCompareA("");
      setCompareB("");
      setPlacesState("error");
      setPlacesError(error instanceof Error ? error.message : "Live POI lookup failed.");
    }
  }, [cityCenter]);

  const loadWeather = useCallback(async () => {
    setWeatherState("loading");
    setWeatherError("");
    try {
      const response = await fetch(`/api/weather?lat=${cityCenter.lat}&lng=${cityCenter.lng}`);
      const data = (await response.json()) as WeatherState | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error || "Weather failed." : "Weather failed.");
      }
      if (!("temperature" in data)) {
        throw new Error("Weather returned an unexpected response.");
      }
      setWeather(data);
      setWeatherState("ready");
    } catch (error) {
      setWeather(null);
      setWeatherState("error");
      setWeatherError(error instanceof Error ? error.message : "Weather failed.");
    }
  }, [cityCenter]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setSupabaseConnected(Boolean(data.supabaseConnected));
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          try {
            const raw = window.localStorage.getItem(localReportsKey);
            const localOnly: CitizenReport[] = raw ? JSON.parse(raw).filter(isValidStoredReport) : [];
            const existingIds = new Set(data.reports.map((r: CitizenReport) => r.id));
            const uniqueLocal = localOnly.filter((r) => !existingIds.has(r.id));
            setReports([...uniqueLocal, ...data.reports]);
          } catch {
            setReports(data.reports);
          }
          return;
        }
      }
    } catch {
      // Local storage fallback
    }

    try {
      const raw = window.localStorage.getItem(localReportsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CitizenReport[];
      const valid = parsed.filter(isValidStoredReport);
      setReports([...valid, ...demoReports]);
    } catch {
      setReportStatus("error");
      setReportMessage("Saved local reports could not be read, so only seeded demo reports are shown.");
    }
  }, []);

  useEffect(() => {
    void loadWeather();
    void loadPlaces();
    void loadReports();
  }, [loadWeather, loadPlaces, loadReports]);

  useEffect(() => {
    const localOnlyReports = reports.filter((report) => !report.isSeeded);
    window.localStorage.setItem(localReportsKey, JSON.stringify(localOnlyReports));
  }, [reports]);

  const filteredPlaces = useMemo(
    () => places.filter((place) => activeFilters.has(place.category)),
    [places, activeFilters]
  );

  const nearbyReports = useMemo(() => {
    const target = selectedPlace?.coordinates ?? cityCenter;
    return reports
      .map((report) => ({ ...report, distance: distanceKm(report.coordinates, target) }))
      .filter((report) => report.distance < 4)
      .sort((a, b) => a.distance - b.distance);
  }, [cityCenter, reports, selectedPlace]);

  const filteredReports = useMemo(
    () => reports.filter((report) => activeReportCategories.has(report.category)),
    [activeReportCategories, reports]
  );

  const concernInsight = useMemo(() => {
    const target = selectedPlace?.coordinates ?? cityCenter;
    return calculateReportedConcern(reports, target);
  }, [cityCenter, reports, selectedPlace]);

  const womenPlanningAid = useMemo(
    () => buildWomenPlanningAid(concernInsight, reportDraft.observedTime, nearbyReports),
    [concernInsight, nearbyReports, reportDraft.observedTime]
  );

  const comparePlaceA = places.find((place) => place.id === compareA) ?? null;
  const comparePlaceB = places.find((place) => place.id === compareB) ?? null;

  function toggleFilter(filter: PlaceCategory) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  function toggleReportCategory(category: IncidentCategory) {
    setActiveReportCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function handleReportImage(file: File | undefined) {
    setReportStatus("idle");
    if (!file) {
      setReportDraft((draft) => ({ ...draft, imageDataUrl: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setReportStatus("error");
      setReportMessage("Please attach an image file only.");
      return;
    }
    if (file.size > 750_000) {
      setReportStatus("error");
      setReportMessage("Image is too large for browser-local demo storage. Use an image under 750 KB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setReportDraft((draft) => ({ ...draft, imageDataUrl: dataUrl }));
  }

  async function performSearch(searchTerm: string) {
    setSearchState("loading");
    setSearchError("");
    setSearchResults([]);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = (await response.json()) as CitySearchResult[] | { error?: string };
      if (!response.ok) throw new Error("error" in data ? data.error || "City search failed." : "City search failed.");
      if (!Array.isArray(data)) throw new Error("City search returned an unexpected response.");
      setSearchResults(data);
      setSearchState(data.length ? "ready" : "empty");
      if (data[0]) applySearchResult(data[0]);
    } catch (error) {
      setSearchState("error");
      setSearchError(error instanceof Error ? error.message : "City search failed.");
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    await performSearch(query.trim());
  }

  function applySearchResult(result: CitySearchResult) {
    setCity(result.name);
    setCityCenter(result.coordinates);
    setReportDraft((draft) => ({ ...draft, area: result.name }));
  }

  function useDemoFallback() {
    setPlaces(demoPlaces);
    setPlacesState("ready");
    setPlacesMeta({
      source: "OpenStreetMap Overpass",
      attribution: "Demo fallback records from CityPulse seed data. These are not live API results.",
      fetchedAt: new Date().toISOString(),
      cached: false,
      warning: "Using explicitly selected demo fallback data because live POIs were unavailable or empty."
    });
    setUsingFallbackData(true);
    setSelectedPlaceId(demoPlaces[0].id);
    setCompareA(demoPlaces[0].id);
    setCompareB(demoPlaces[1].id);
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assistantQuestion.trim()) return;
    setAssistantState("loading");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: assistantQuestion.trim(),
          city,
          cityCenter,
          selectedPlaceId: selectedPlace?.id,
          places: places.slice(0, 15).map((p) => ({
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
          weather: weather
            ? {
                temperature: weather.temperature,
                windSpeed: weather.windSpeed,
                weatherCode: weather.weatherCode,
                summary: weather.summary,
                observedAt: weather.observedAt,
                source: weather.source
              }
            : null,
          reports: reports.slice(0, 15).map((r) => ({
            id: r.id,
            category: r.category,
            title: r.title,
            detail: r.detail,
            coordinates: r.coordinates,
            area: r.area,
            createdAt: r.createdAt,
            status: r.status,
            moderationStatus: r.moderationStatus
          })),
          routePlaceIds: [compareA, compareB].filter(Boolean)
        })
      });
      if (!response.ok) throw new Error("Assistant request failed");
      const data = (await response.json()) as AssistantResponse;
      setAssistantData(data);
      setAssistantAnswer(data.answer);
      setAssistantState("idle");
    } catch {
      setAssistantState("error");
      setAssistantAnswer("The assistant is temporarily unavailable. The map, weather panel and reports still work.");
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportStatus("idle");
    const title = sanitizeText(reportDraft.title, 80);
    const detail = sanitizeText(reportDraft.detail, 420);
    const area = sanitizeText(reportDraft.area, 80) || city;
    const observedTime = new Date(reportDraft.observedTime);

    if (!title || !detail) {
      setReportStatus("error");
      setReportMessage("Add a short title and description before submitting.");
      return;
    }

    if (Number.isNaN(observedTime.getTime()) || observedTime.getTime() > Date.now() + 5 * 60 * 1000) {
      setReportStatus("error");
      setReportMessage("Choose a valid observation time that is not in the future.");
      return;
    }

    const base = selectedPlace?.coordinates ?? cityCenter;
    const offset = reports.length * 0.002;
    const report: CitizenReport = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: reportDraft.category,
      title,
      detail,
      area,
      coordinates: reportDraft.precision === "exact" ? base : { lat: base.lat + offset, lng: base.lng - offset },
      createdAt: observedTime.toISOString(),
      status: "unverified",
      moderationStatus: "pending_review",
      source: "community_local",
      evidence: reportDraft.imageDataUrl ? "text_image" : "text",
      imageDataUrl: reportDraft.imageDataUrl || undefined,
      isSeeded: false
    };

    setReports((current) => [report, ...current]);
    setShowSafetyLayer(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
      });
      const data = await res.json();
      if (data.source === "supabase") {
        setReportStatus("success");
        setReportMessage("Report saved and synced to Supabase database! (Status: unverified)");
      } else {
        setReportStatus("success");
        setReportMessage("Report saved locally. (Connect Supabase to sync in real time)");
      }
    } catch {
      setReportStatus("success");
      setReportMessage("Report saved in this browser session.");
    }

    setReportDraft({
      category: "safety_concerns",
      title: "",
      detail: "",
      area: city,
      precision: "approximate",
      observedTime: new Date().toISOString().slice(0, 16),
      imageDataUrl: ""
    });
  }

  return (
    <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white/85 p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-signal">Live city data with transparent fallbacks</p>
            <h1 className="text-3xl font-bold sm:text-4xl">CityPulse AI</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Search a city, load available OpenStreetMap POIs, check coordinate-based weather, and separate live data from unverified reports.
            </p>
          </div>
          <form className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="city-search">Search city or place</label>
            <input
              id="city-search"
              className="focus-ring min-h-11 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Pune, Kothrud, Mumbai..."
            />
            <button className="focus-ring min-h-11 rounded-md bg-river px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={searchState === "loading"} type="submit">
              {searchState === "loading" ? "Searching" : "Search"}
            </button>
          </form>
        </header>

        {searchState === "error" && <StatusPanel tone="warning" message={searchError} actionLabel="Retry search" onAction={() => query && void performSearch(query)} />}
        {searchState === "empty" && <StatusPanel tone="neutral" message="No geocoding results were returned. Try a more specific city or neighborhood." />}

        {searchResults.length > 1 && (
          <section className="rounded-lg border border-stone-200 bg-white/85 p-3" aria-label="Search results">
            <div className="flex gap-2 overflow-x-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="focus-ring shrink-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-xs hover:border-river"
                  type="button"
                  onClick={() => applySearchResult(result)}
                >
                  <span className="block font-semibold">{result.name}</span>
                  <span className="block max-w-60 truncate text-slate-500">{result.displayName}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{result.source}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_430px]">
          <div className="flex flex-col gap-4">
            <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-soft">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{city} Explorer</h2>
                  <p className="text-sm text-slate-600">
                    {placesState === "ready"
                      ? `${places.length} ${usingFallbackData ? "demo fallback" : "live OSM"} place${places.length === 1 ? "" : "s"} loaded.`
                      : "Live POIs load from OpenStreetMap Overpass after city search."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      className={`focus-ring rounded-md border px-3 py-2 text-sm font-medium ${
                        activeFilters.has(filter) ? "border-river bg-river text-white" : "border-stone-300 bg-white text-slate-700"
                      }`}
                      type="button"
                      aria-pressed={activeFilters.has(filter)}
                      onClick={() => toggleFilter(filter)}
                    >
                      {filterLabels[filter]}
                    </button>
                  ))}
                  <button
                    className={`focus-ring rounded-md border px-3 py-2 text-sm font-medium ${
                      showSafetyLayer ? "border-signal bg-signal text-white" : "border-stone-300 bg-white text-slate-700"
                    }`}
                    type="button"
                    aria-pressed={showSafetyLayer}
                    onClick={() => setShowSafetyLayer((value) => !value)}
                  >
                    Safety layer
                  </button>
                </div>
              </div>

              {placesState === "error" && (
                <StatusPanel tone="warning" message={placesError} actionLabel="Retry live POIs" onAction={() => void loadPlaces()} secondaryActionLabel="Use labelled demo fallback" onSecondaryAction={useDemoFallback} />
              )}
              {placesState === "empty" && (
                <StatusPanel tone="neutral" message={placesMeta?.warning ?? "No matching OpenStreetMap POIs were returned."} actionLabel="Retry live POIs" onAction={() => void loadPlaces()} secondaryActionLabel="Use labelled demo fallback" onSecondaryAction={useDemoFallback} />
              )}
              {placesState === "loading" && <div className="mb-3 rounded-md border border-stone-200 bg-paper px-4 py-3 text-sm text-slate-600">Loading live POIs from OpenStreetMap Overpass...</div>}

              <CityMap
                center={cityCenter}
                places={filteredPlaces}
                reports={filteredReports}
                selectedPlaceId={selectedPlace?.id}
                showSafetyLayer={showSafetyLayer}
                onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Map tiles © OpenStreetMap contributors. {placesMeta?.attribution ?? "POI data loads from OpenStreetMap Overpass when available."}
                {placesMeta?.cached ? " Cached response." : ""}
              </p>
              <div className="mt-3 rounded-md border border-stone-200 bg-paper p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold">Incident report filters</h3>
                    <p className="text-xs text-slate-600">Showing {filteredReports.length} of {reports.length} reports. Local reports stay in this browser only.</p>
                  </div>
                  <button
                    className="focus-ring rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-semibold"
                    type="button"
                    onClick={() => setActiveReportCategories(new Set(incidentCategories))}
                  >
                    Show all
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {incidentCategories.map((category) => (
                    <button
                      key={category}
                      className={`focus-ring rounded-md border px-2 py-1 text-xs font-medium ${
                        activeReportCategories.has(category) ? "border-signal bg-signal text-white" : "border-stone-300 bg-white text-slate-700"
                      }`}
                      type="button"
                      aria-pressed={activeReportCategories.has(category)}
                      onClick={() => toggleReportCategory(category)}
                    >
                      {incidentCategoryLabels[category]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Place cards">
              {filteredPlaces.length === 0 ? (
                <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-slate-600">
                  {placesState === "ready" ? "No places match the selected filters." : "No place cards to show until live POIs load or demo fallback is selected."}
                </div>
              ) : (
                filteredPlaces.map((place) => (
                  <button
                    key={place.id}
                    className={`focus-ring rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${
                      selectedPlace?.id === place.id ? "border-river" : "border-stone-200"
                    }`}
                    type="button"
                    onClick={() => setSelectedPlaceId(place.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold">{place.name}</h3>
                      <span className="rounded bg-paper px-2 py-1 text-xs font-semibold capitalize text-moss">{place.category}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{place.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {place.tags.length ? place.tags.map((tag) => (
                        <span key={tag} className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">{tag}</span>
                      )) : <span className="text-xs text-slate-500">No extra OSM tags available</span>}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Source: {place.source}{place.isFallback ? " (labelled fallback)" : ""}</p>
                  </button>
                ))
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selectedPlace?.name ?? "No place selected"}</h2>
                  <p className="text-sm text-slate-600">{selectedPlace?.area ?? "Load live POIs or select a fallback place."}</p>
                </div>
                {selectedPlace && <span className="rounded bg-paper px-2 py-1 text-xs font-semibold capitalize text-moss">{selectedPlace.category}</span>}
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {selectedPlace?.description ?? "This panel will show normalized source, coordinates, IDs, attributes and timestamps for the selected marker."}
              </p>
              {selectedPlace && (
                <dl className="mt-4 grid grid-cols-1 gap-2 rounded-md border border-stone-200 bg-paper p-3 text-sm">
                  <MetaRow label="Provider ID" value={selectedPlace.providerId} />
                  <MetaRow label="Coordinates" value={`${selectedPlace.coordinates.lat.toFixed(5)}, ${selectedPlace.coordinates.lng.toFixed(5)}`} />
                  <MetaRow label="Collected" value={formatDate(selectedPlace.collectedAt)} />
                  <MetaRow label="Source" value={selectedPlace.source} />
                </dl>
              )}
              {selectedPlace && Object.keys(selectedPlace.attributes).length > 0 && (
                <div className="mt-3 rounded-md border border-stone-200 p-3">
                  <h3 className="text-sm font-bold">Source attributes</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(selectedPlace.attributes).slice(0, 10).map(([key, value]) => (
                      <span key={key} className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">{key}: {value}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 rounded-md border border-stone-200 bg-paper p-3">
                <h3 className="text-sm font-bold">Transparent safety context</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {nearbyReports.length ? `${nearbyReports.length} nearby unverified report${nearbyReports.length === 1 ? "" : "s"} are visible.` : "No community reports are available nearby; this does not indicate safety."}
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {(selectedPlace?.safetyNotes ?? ["Live POIs are not safety data."]).map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
              <div className="mt-3 rounded-md border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">Relative reported-concern indicator</h3>
                    <p className="mt-1 text-sm text-slate-600">{concernInsight.label}</p>
                  </div>
                  <span className="rounded bg-paper px-2 py-1 text-xs font-bold">{concernInsight.level}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{concernInsight.explanation}</p>
                <p className="mt-2 text-xs font-semibold text-slate-700">This is not an official safety, crime or police score. Missing reports are data gaps, not proof of safety.</p>
              </div>
              <div className="mt-3 rounded-md border border-stone-200 p-3">
                <h3 className="text-sm font-bold">Women-focused planning aid</h3>
                <p className="mt-1 text-sm text-slate-700">{womenPlanningAid.summary}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {womenPlanningAid.tips.map((tip) => <li key={tip}>{tip}</li>)}
                </ul>
                <div className="mt-3 rounded bg-paper p-2 text-xs text-slate-700">
                  India emergency: <a className="font-semibold underline" href="tel:112">112</a> • Women helpline: <a className="font-semibold underline" href="tel:1091">1091</a> • Women helpline alternate: <a className="font-semibold underline" href="tel:181">181</a>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Weather</h2>
                <button className="focus-ring rounded-md border border-stone-300 px-2 py-1 text-xs" type="button" onClick={() => void loadWeather()}>Retry</button>
              </div>
              {weatherState === "loading" && <p className="mt-2 text-sm text-slate-600">Loading coordinate-based weather...</p>}
              {weatherState === "error" && <p className="mt-2 text-sm text-amber-700">{weatherError}</p>}
              {weather && weatherState === "ready" && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-paper p-3"><p className="text-2xl font-bold">{Math.round(weather.temperature)}C</p><p className="text-xs text-slate-500">Temp</p></div>
                  <div className="rounded-md bg-paper p-3"><p className="text-2xl font-bold">{Math.round(weather.windSpeed)}</p><p className="text-xs text-slate-500">km/h wind</p></div>
                  <div className="rounded-md bg-paper p-3"><p className="text-sm font-bold">{weather.summary}</p><p className="text-xs text-slate-500">{weather.source}</p></div>
                </div>
              )}
              {weather && <p className="mt-2 text-xs text-slate-500">Observed {formatDate(weather.observedAt)}. Fetched {formatDate(weather.fetchedAt)}.</p>}
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">AI Assistant</h2>
                {assistantData && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      assistantData.source === "gemini"
                        ? "border-purple-200 bg-purple-50 text-purple-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        assistantData.source === "gemini" ? "bg-purple-600 animate-pulse" : "bg-amber-500"
                      }`}
                    ></span>
                    {assistantData.source === "gemini"
                      ? `Gemini ${assistantData.model || "Flash"}`
                      : "Deterministic Fallback"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Grounds answers strictly in loaded OpenStreetMap POIs, Open-Meteo weather, and unverified reports.
              </p>
              <form className="mt-3 space-y-2" onSubmit={askAssistant}>
                <label className="sr-only" htmlFor="assistant-question">
                  Ask CityPulse AI
                </label>
                <textarea
                  id="assistant-question"
                  className="focus-ring min-h-20 w-full rounded-md border border-stone-300 p-3 text-sm"
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  placeholder="e.g. Suggest a 3-stop food & heritage itinerary, or compare the selected route with current weather."
                />
                <button
                  className="focus-ring w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={assistantState === "loading"}
                  type="submit"
                >
                  {assistantState === "loading" ? "Analyzing with Gemini..." : "Ask assistant"}
                </button>
              </form>
              {assistantState === "error" && (
                <p className="mt-2 text-sm text-amber-700">Assistant request encountered an error.</p>
              )}
              <div className="mt-3 whitespace-pre-line rounded-md bg-paper p-3 text-sm text-slate-800">
                {assistantAnswer}
              </div>

              {/* Recommended Place Chips */}
              {assistantData?.recommendedPlaceIds && assistantData.recommendedPlaceIds.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recommended Stops (Click to view):</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {assistantData.recommendedPlaceIds.map((id) => {
                      const place = places.find((p) => p.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedPlaceId(id)}
                          className={`rounded border px-2 py-1 text-xs font-medium transition ${
                            selectedPlaceId === id
                              ? "border-river bg-river text-white"
                              : "border-stone-300 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          📍 {place ? place.name : id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Verified Structured Itinerary */}
              {assistantData?.itinerary && (
                <div className="mt-3 rounded-md border border-purple-200 bg-purple-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-purple-900">
                      🗺️ {assistantData.itinerary.title}
                    </h3>
                    <span className="text-xs font-semibold text-purple-700">
                      Total: ~{assistantData.itinerary.estimatedTotalKm} km
                    </span>
                  </div>
                  <ol className="mt-2 space-y-2 text-xs">
                    {assistantData.itinerary.steps.map((step, idx) => (
                      <li
                        key={step.placeId + idx}
                        onClick={() => setSelectedPlaceId(step.placeId)}
                        className="cursor-pointer rounded border border-purple-100 bg-white p-2 shadow-sm transition hover:border-purple-300"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>
                            {idx + 1}. {step.placeName}
                          </span>
                          {step.distanceFromPrevKm !== undefined && (
                            <span className="text-[10px] text-slate-500">
                              +{step.distanceFromPrevKm} km
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-slate-600">{step.note}</p>
                        {step.weatherContext && (
                          <p className="mt-0.5 text-[10px] text-purple-600">
                            🌤️ Weather context: {step.weatherContext}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Numeric Grounding Stats */}
              {assistantData?.numericCalculations && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span>📊 {assistantData.numericCalculations.placesCount} POIs analyzed</span>
                  <span>•</span>
                  <span>
                    ⚠️ {assistantData.numericCalculations.reportsCount} reports (
                    {assistantData.numericCalculations.unverifiedReportsCount} unverified)
                  </span>
                </div>
              )}
            </section>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <form className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft" onSubmit={submitReport}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Citizen Report</h2>
              {supabaseConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Supabase Live Sync
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600" title="Add Supabase credentials to sync with cloud database">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Local & Offline Ready
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">Reports are stored with full transparency, unverified by default, and never treated as official crime or safety data.</p>
            {reportStatus !== "idle" && (
              <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${reportStatus === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
                {reportMessage}
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Category
                <select className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2" value={reportDraft.category} onChange={(event) => setReportDraft((draft) => ({ ...draft, category: event.target.value as CitizenReport["category"] }))}>
                  {incidentCategories.map((category) => <option key={category} value={category}>{incidentCategoryLabels[category]}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Area
                <input className="focus-ring mt-1 w-full rounded-md border border-stone-300 px-3 py-2" value={reportDraft.area} onChange={(event) => setReportDraft((draft) => ({ ...draft, area: event.target.value }))} />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">Observed time
              <input
                className="focus-ring mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                type="datetime-local"
                value={reportDraft.observedTime}
                onChange={(event) => setReportDraft((draft) => ({ ...draft, observedTime: event.target.value }))}
                required
              />
            </label>
            <label className="mt-3 block text-sm font-medium">Short title
              <input className="focus-ring mt-1 w-full rounded-md border border-stone-300 px-3 py-2" value={reportDraft.title} onChange={(event) => setReportDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Dim lighting near lane" required />
            </label>
            <label className="mt-3 block text-sm font-medium">Details
              <textarea className="focus-ring mt-1 min-h-24 w-full rounded-md border border-stone-300 p-3" value={reportDraft.detail} onChange={(event) => setReportDraft((draft) => ({ ...draft, detail: event.target.value }))} placeholder="What did you observe? Avoid names and personal details." required />
            </label>
            <label className="mt-3 block text-sm font-medium">Optional image evidence
              <input className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" type="file" accept="image/*" onChange={(event) => void handleReportImage(event.target.files?.[0])} />
            </label>
            {reportDraft.imageDataUrl && (
              <div className="mt-3 rounded-md border border-stone-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Selected incident evidence preview" src={reportDraft.imageDataUrl} className="max-h-40 rounded object-cover" />
                <button className="focus-ring mt-2 rounded-md border border-stone-300 px-3 py-1 text-xs" type="button" onClick={() => setReportDraft((draft) => ({ ...draft, imageDataUrl: "" }))}>Remove image</button>
              </div>
            )}
            <fieldset className="mt-3 rounded-md border border-stone-200 p-3">
              <legend className="px-1 text-sm font-semibold">Location precision</legend>
              <div className="flex gap-3 text-sm">
                {["approximate", "exact"].map((precision) => (
                  <label key={precision} className="flex items-center gap-2">
                    <input type="radio" name="precision" checked={reportDraft.precision === precision} onChange={() => setReportDraft((draft) => ({ ...draft, precision }))} />
                    {precision}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="focus-ring mt-4 w-full rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white" type="submit">Submit unverified report</button>
          </form>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
            <h2 className="text-lg font-bold">Compare Locations</h2>
            {places.length < 2 ? (
              <p className="mt-3 rounded-md bg-paper p-3 text-sm text-slate-600">Load at least two places to compare. Demo fallback is available only through the labelled fallback button.</p>
            ) : (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">First place
                    <select className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2" value={compareA} onChange={(event) => setCompareA(event.target.value)}>
                      {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">Second place
                    <select className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2" value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                      {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[comparePlaceA, comparePlaceB].filter((place): place is Place => Boolean(place)).map((place) => {
                    const placeReports = reports.filter((report) => distanceKm(report.coordinates, place.coordinates) < 4);
                    return (
                      <article key={place.id} className="rounded-md border border-stone-200 bg-paper p-3">
                        <h3 className="font-bold">{place.name}</h3>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-3"><dt>Area</dt><dd className="text-right font-medium">{place.area}</dd></div>
                          <div className="flex justify-between gap-3"><dt>Type</dt><dd className="text-right font-medium capitalize">{place.category}</dd></div>
                          <div className="flex justify-between gap-3"><dt>Source</dt><dd className="text-right font-medium">{place.source}</dd></div>
                          <div className="flex justify-between gap-3"><dt>Reports nearby</dt><dd className="text-right font-medium">{placeReports.length || "None available"}</dd></div>
                        </dl>
                        <p className="mt-3 text-xs text-slate-600">Report count is not a safety score. No ratings, prices or opening hours are inferred.</p>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusPanel({ tone, message, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }: { tone: "warning" | "neutral"; message: string; actionLabel?: string; onAction?: () => void; secondaryActionLabel?: string; onSecondaryAction?: () => void }) {
  const toneClass = tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-stone-200 bg-white text-slate-700";
  return (
    <div className={`mb-3 flex flex-col gap-3 rounded-md border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${toneClass}`}>
      <p>{message}</p>
      <div className="flex flex-wrap gap-2">
        {actionLabel && onAction && <button className="focus-ring rounded-md border border-current px-3 py-1 font-semibold" type="button" onClick={onAction}>{actionLabel}</button>}
        {secondaryActionLabel && onSecondaryAction && <button className="focus-ring rounded-md bg-ink px-3 py-1 font-semibold text-white" type="button" onClick={onSecondaryAction}>{secondaryActionLabel}</button>}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[220px] truncate text-right font-medium" title={value}>{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function isValidStoredReport(report: CitizenReport) {
  return Boolean(
    report &&
      typeof report.id === "string" &&
      incidentCategories.includes(report.category) &&
      typeof report.detail === "string" &&
      Number.isFinite(report.coordinates?.lat) &&
      Number.isFinite(report.coordinates?.lng) &&
      report.source === "community_local" &&
      !report.isSeeded
  );
}

function calculateReportedConcern(reports: CitizenReport[], target: Coordinates) {
  const nearby = reports
    .map((report) => ({ report, distance: distanceKm(report.coordinates, target), ageHours: Math.max(0, (Date.now() - new Date(report.createdAt).getTime()) / 36e5) }))
    .filter(({ distance }) => distance < 3);

  const weighted = nearby.reduce((total, item) => {
    const recency = item.ageHours <= 24 ? 1.5 : item.ageHours <= 168 ? 1 : 0.45;
    const severity = ["accidents", "safety_concerns", "poor_lighting", "flooding"].includes(item.report.category) ? 1.25 : 1;
    const evidence = item.report.evidence === "text_image" ? 1.15 : 1;
    const verification = item.report.moderationStatus === "verified" ? 1.25 : 1;
    return total + recency * severity * evidence * verification;
  }, 0);

  const level = weighted >= 7 ? "Elevated" : weighted >= 3 ? "Moderate" : nearby.length > 0 ? "Low" : "No local reports";
  const label =
    level === "No local reports"
      ? "No reports are available within 3 km of the selected point."
      : `${nearby.length} report${nearby.length === 1 ? "" : "s"} within 3 km, weighted by recency, category, evidence and moderation status.`;

  return {
    level,
    count: nearby.length,
    weighted,
    label,
    explanation:
      nearby.length === 0
        ? "The indicator cannot assess conditions without reports. This is a data gap."
        : `Recent incidents and higher-concern categories contribute more. Current weighted signal: ${weighted.toFixed(1)}.`
  };
}

function buildWomenPlanningAid(
  concern: ReturnType<typeof calculateReportedConcern>,
  observedTime: string,
  nearbyReports: Array<CitizenReport & { distance: number }>
) {
  const hour = new Date(observedTime).getHours();
  const isNight = hour >= 21 || hour < 6;
  const relevantConcerns = nearbyReports.filter((report) => ["poor_lighting", "safety_concerns", "congestion", "obstructions"].includes(report.category));
  const caution =
    isNight || concern.level === "Elevated" || relevantConcerns.length > 0
      ? "Use extra caution for women-focused trip planning in this area and time window based on available reports and general night-travel risk factors."
      : "No women-specific safety conclusion can be made from current reports. Plan normally, but verify locally and keep standard precautions.";

  return {
    summary: `${caution} This is not an official women-safety rating and does not mean the area is safe or unsafe.`,
    tips: [
      isNight ? "Night-time selected: prefer well-lit routes, trusted transport and shared trip status." : "Day/evening selected: still check lighting, crowding and last-mile transport.",
      relevantConcerns.length ? `${relevantConcerns.length} nearby report(s) mention lighting, safety, congestion or obstructions.` : "No nearby women-relevant reports are currently available; treat that as limited data.",
      "Avoid sharing personal identity details in reports; call emergency services if there is immediate danger."
    ]
  };
}
