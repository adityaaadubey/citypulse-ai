"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoPlaces, demoReports, distanceKm, filterLabels, puneCenter } from "@/lib/data";
import type { CitizenReport, CitySearchResult, Coordinates, Place, PlaceCategory, WeatherState } from "@/lib/types";

const CityMap = dynamic(() => import("@/components/CityMap"), {
  ssr: false,
  loading: () => <div className="grid min-h-[420px] place-items-center rounded-lg bg-slate-100 text-sm text-slate-600">Loading map...</div>
});

const filters: PlaceCategory[] = ["food", "attraction", "heritage", "hotel", "budget"];

export default function CityPulseDashboard() {
  const [city, setCity] = useState("Pune");
  const [cityCenter, setCityCenter] = useState<Coordinates>(puneCenter);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [activeFilters, setActiveFilters] = useState<Set<PlaceCategory>>(new Set(filters));
  const [selectedPlace, setSelectedPlace] = useState<Place>(demoPlaces[0]);
  const [reports, setReports] = useState<CitizenReport[]>(demoReports);
  const [showSafetyLayer, setShowSafetyLayer] = useState(true);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherState, setWeatherState] = useState<"loading" | "ready" | "error">("loading");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask about routes, neighborhood context, or what the current data can and cannot tell you.");
  const [assistantState, setAssistantState] = useState<"idle" | "loading" | "error">("idle");
  const [compareA, setCompareA] = useState(demoPlaces[0].id);
  const [compareB, setCompareB] = useState(demoPlaces[1].id);
  const [reportDraft, setReportDraft] = useState({
    category: "safety_concerns" as CitizenReport["category"],
    title: "",
    detail: "",
    area: "Pune",
    precision: "approximate"
  });

  useEffect(() => {
    let active = true;
    setWeatherState("loading");
    fetch(`/api/weather?lat=${cityCenter.lat}&lng=${cityCenter.lng}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather failed");
        return (await response.json()) as WeatherState;
      })
      .then((data) => {
        if (!active) return;
        setWeather(data);
        setWeatherState("ready");
      })
      .catch(() => {
        if (!active) return;
        setWeather(null);
        setWeatherState("error");
      });
    return () => {
      active = false;
    };
  }, [cityCenter]);

  const filteredPlaces = useMemo(
    () => demoPlaces.filter((place) => activeFilters.has(place.category)),
    [activeFilters]
  );

  const nearbyReports = useMemo(
    () =>
      reports
        .map((report) => ({
          ...report,
          distance: distanceKm(report.coordinates, selectedPlace.coordinates)
        }))
        .filter((report) => report.distance < 4)
        .sort((a, b) => a.distance - b.distance),
    [reports, selectedPlace]
  );

  const comparePlaceA = demoPlaces.find((place) => place.id === compareA) ?? demoPlaces[0];
  const comparePlaceB = demoPlaces.find((place) => place.id === compareB) ?? demoPlaces[1];

  function toggleFilter(filter: PlaceCategory) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchState("loading");
    setSearchResults([]);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = (await response.json()) as CitySearchResult[];
      setSearchResults(data);
      setSearchState("idle");
      if (data[0]) {
        applySearchResult(data[0]);
      }
    } catch {
      setSearchState("error");
    }
  }

  function applySearchResult(result: CitySearchResult) {
    setCity(result.name);
    setCityCenter(result.coordinates);
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
          city,
          selectedPlace: selectedPlace.name,
          weather: weather ? `${weather.summary}, ${Math.round(weather.temperature)}C` : undefined,
          reports: nearbyReports.slice(0, 3).map((report) => `${report.title} (${report.status})`),
          question: assistantQuestion
        })
      });
      if (!response.ok) throw new Error("Assistant failed");
      const data = (await response.json()) as { answer: string; missingCredential?: string };
      setAssistantAnswer(data.missingCredential ? `${data.answer}\n\nMissing credential: ${data.missingCredential}.` : data.answer);
      setAssistantState("idle");
    } catch {
      setAssistantState("error");
      setAssistantAnswer("The assistant is unavailable. The map, weather panel and source-labeled reports still work.");
    }
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportDraft.title.trim() || !reportDraft.detail.trim()) return;
    const offset = reports.length * 0.002;
    const report: CitizenReport = {
      id: `report-${Date.now()}`,
      category: reportDraft.category,
      title: reportDraft.title.trim(),
      detail: reportDraft.detail.trim(),
      area: reportDraft.area.trim() || city,
      coordinates: {
        lat: selectedPlace.coordinates.lat + offset,
        lng: selectedPlace.coordinates.lng - offset
      },
      createdAt: new Date().toISOString(),
      status: "unverified",
      moderationStatus: "pending_review",
      source: "community_local",
      evidence: "text",
      isSeeded: false
    };
    setReports((current) => [report, ...current]);
    setShowSafetyLayer(true);
    setReportDraft({ category: "safety_concerns", title: "", detail: "", area: city, precision: "approximate" });
  }

  return (
    <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white/85 p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-signal">Pune-first hackathon MVP</p>
            <h1 className="text-3xl font-bold sm:text-4xl">CityPulse AI</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Map-first city exploration with source-labeled weather, places and unverified citizen reports. No reports never means safe.
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

        {searchState === "error" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            City search is unavailable. Pune demo data is still loaded.
          </div>
        )}

        {searchResults.length > 1 && (
          <section className="rounded-lg border border-stone-200 bg-white/85 p-3" aria-label="Search results">
            <div className="flex gap-2 overflow-x-auto">
              {searchResults.map((result) => (
                <button
                  key={result.displayName}
                  className="focus-ring shrink-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-xs hover:border-river"
                  type="button"
                  onClick={() => applySearchResult(result)}
                >
                  <span className="block font-semibold">{result.name}</span>
                  <span className="block max-w-60 truncate text-slate-500">{result.displayName}</span>
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
                  <p className="text-sm text-slate-600">Showing demo Pune places. Searched cities update map center and weather.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      className={`focus-ring rounded-md border px-3 py-2 text-sm font-medium ${
                        activeFilters.has(filter)
                          ? "border-river bg-river text-white"
                          : "border-stone-300 bg-white text-slate-700"
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
              <CityMap
                center={cityCenter}
                places={filteredPlaces}
                reports={reports}
                selectedPlaceId={selectedPlace.id}
                showSafetyLayer={showSafetyLayer}
                onSelectPlace={setSelectedPlace}
              />
              <p className="mt-2 text-xs text-slate-500">
                Map data © OpenStreetMap contributors. Report markers are unverified community/demo observations, not official safety data.
              </p>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Place cards">
              {filteredPlaces.length === 0 ? (
                <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-slate-600">No places match the selected filters.</div>
              ) : (
                filteredPlaces.map((place) => (
                  <button
                    key={place.id}
                    className={`focus-ring rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${
                      selectedPlace.id === place.id ? "border-river" : "border-stone-200"
                    }`}
                    type="button"
                    onClick={() => setSelectedPlace(place)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold">{place.name}</h3>
                      <span className="rounded bg-paper px-2 py-1 text-xs font-semibold capitalize text-moss">{place.category}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{place.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {place.tags.map((tag) => (
                        <span key={tag} className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Source: {place.source} data</p>
                  </button>
                ))
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selectedPlace.name}</h2>
                  <p className="text-sm text-slate-600">{selectedPlace.area}</p>
                </div>
                <span className="rounded bg-paper px-2 py-1 text-xs font-semibold capitalize text-moss">{selectedPlace.budget} budget</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{selectedPlace.description}</p>
              <div className="mt-4 rounded-md border border-stone-200 bg-paper p-3">
                <h3 className="text-sm font-bold">Transparent safety context</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {nearbyReports.length
                    ? `${nearbyReports.length} nearby unverified report${nearbyReports.length === 1 ? "" : "s"} are visible.`
                    : "No community reports are available nearby; this does not indicate safety."}
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {selectedPlace.safetyNotes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft" aria-live="polite">
              <h2 className="text-lg font-bold">Weather</h2>
              {weatherState === "loading" && <p className="mt-2 text-sm text-slate-600">Loading current weather...</p>}
              {weatherState === "error" && <p className="mt-2 text-sm text-amber-700">Weather unavailable. This panel will recover when the provider responds.</p>}
              {weather && weatherState === "ready" && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-paper p-3">
                    <p className="text-2xl font-bold">{Math.round(weather.temperature)}C</p>
                    <p className="text-xs text-slate-500">Temp</p>
                  </div>
                  <div className="rounded-md bg-paper p-3">
                    <p className="text-2xl font-bold">{Math.round(weather.windSpeed)}</p>
                    <p className="text-xs text-slate-500">km/h wind</p>
                  </div>
                  <div className="rounded-md bg-paper p-3">
                    <p className="text-sm font-bold">{weather.summary}</p>
                    <p className="text-xs text-slate-500">{weather.source}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
              <h2 className="text-lg font-bold">AI Assistant</h2>
              <form className="mt-3 space-y-2" onSubmit={askAssistant}>
                <label className="sr-only" htmlFor="assistant-question">Ask CityPulse AI</label>
                <textarea
                  id="assistant-question"
                  className="focus-ring min-h-24 w-full rounded-md border border-stone-300 p-3 text-sm"
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  placeholder="Should I compare this with Aga Khan Palace for a half-day plan?"
                />
                <button className="focus-ring w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={assistantState === "loading"} type="submit">
                  {assistantState === "loading" ? "Thinking" : "Ask assistant"}
                </button>
              </form>
              {assistantState === "error" && <p className="mt-2 text-sm text-amber-700">Assistant request failed.</p>}
              <p className="mt-3 whitespace-pre-line rounded-md bg-paper p-3 text-sm text-slate-700">{assistantAnswer}</p>
            </section>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <form className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft" onSubmit={submitReport}>
            <h2 className="text-lg font-bold">Citizen Report</h2>
            <p className="mt-1 text-sm text-slate-600">Reports are approximate, unverified by default, and never treated as official crime or safety data.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Category
                <select
                  className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"
                  value={reportDraft.category}
                  onChange={(event) => setReportDraft((draft) => ({ ...draft, category: event.target.value as CitizenReport["category"] }))}
                >
                  <option value="poor_lighting">Poor lighting</option>
                  <option value="congestion">Congestion</option>
                  <option value="flooding">Flooding</option>
                  <option value="obstructions">Obstructions</option>
                  <option value="safety_concerns">Safety concerns</option>
                  <option value="cleanliness">Cleanliness</option>
                  <option value="accidents">Accidents</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Area
                <input
                  className="focus-ring mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                  value={reportDraft.area}
                  onChange={(event) => setReportDraft((draft) => ({ ...draft, area: event.target.value }))}
                />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">
              Short title
              <input
                className="focus-ring mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                value={reportDraft.title}
                onChange={(event) => setReportDraft((draft) => ({ ...draft, title: event.target.value }))}
                placeholder="Dim lighting near lane"
                required
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Details
              <textarea
                className="focus-ring mt-1 min-h-24 w-full rounded-md border border-stone-300 p-3"
                value={reportDraft.detail}
                onChange={(event) => setReportDraft((draft) => ({ ...draft, detail: event.target.value }))}
                placeholder="What did you observe? Avoid names and personal details."
                required
              />
            </label>
            <fieldset className="mt-3 rounded-md border border-stone-200 p-3">
              <legend className="px-1 text-sm font-semibold">Location precision</legend>
              <div className="flex gap-3 text-sm">
                {["approximate", "exact"].map((precision) => (
                  <label key={precision} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="precision"
                      checked={reportDraft.precision === precision}
                      onChange={() => setReportDraft((draft) => ({ ...draft, precision }))}
                    />
                    {precision}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="focus-ring mt-4 w-full rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white" type="submit">
              Submit unverified report
            </button>
          </form>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
            <h2 className="text-lg font-bold">Compare Locations</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                First place
                <select className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2" value={compareA} onChange={(event) => setCompareA(event.target.value)}>
                  {demoPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Second place
                <select className="focus-ring mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2" value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                  {demoPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[comparePlaceA, comparePlaceB].map((place) => {
                const placeReports = reports.filter((report) => distanceKm(report.coordinates, place.coordinates) < 4);
                return (
                  <article key={place.id} className="rounded-md border border-stone-200 bg-paper p-3">
                    <h3 className="font-bold">{place.name}</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><dt>Area</dt><dd className="text-right font-medium">{place.area}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Type</dt><dd className="text-right font-medium capitalize">{place.category}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Budget label</dt><dd className="text-right font-medium capitalize">{place.budget} demo</dd></div>
                      <div className="flex justify-between gap-3"><dt>Reports nearby</dt><dd className="text-right font-medium">{placeReports.length || "None available"}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs text-slate-600">Report count is not a safety score.</p>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
