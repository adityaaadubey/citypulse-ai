"use client";

import { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { CitizenReport, Coordinates, Place } from "@/lib/types";
import { incidentCategoryLabels } from "@/lib/data";

const placeIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type CityMapProps = {
  center: Coordinates;
  places: Place[];
  reports: CitizenReport[];
  selectedPlaceId?: string;
  showSafetyLayer: boolean;
  onSelectPlace: (place: Place) => void;
};

export default function CityMap({
  center,
  places,
  reports,
  selectedPlaceId,
  showSafetyLayer,
  onSelectPlace
}: CityMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom
      className="z-0 min-h-[420px] rounded-lg"
      aria-label="City map with places and community reports"
    >
      <MapUpdater center={center} selected={places.find((place) => place.id === selectedPlaceId)?.coordinates} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          icon={placeIcon}
          position={[place.coordinates.lat, place.coordinates.lng]}
          eventHandlers={{ click: () => onSelectPlace(place) }}
        >
          <Popup>
            <strong>{place.name}</strong>
            <br />
            {place.area}
            <br />
            <button
              className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
              type="button"
              onClick={() => onSelectPlace(place)}
            >
              View details
            </button>
          </Popup>
        </Marker>
      ))}
      {showSafetyLayer &&
        reports.map((report) => (
          <CircleMarker
            key={report.id}
            center={[report.coordinates.lat, report.coordinates.lng]}
            radius={report.moderationStatus === "verified" ? 12 : 10}
            pathOptions={{
              color: report.isSeeded ? "#8a6f3e" : "#d96c3d",
              fillColor: report.isSeeded ? "#8a6f3e" : "#d96c3d",
              fillOpacity: 0.32,
              weight: 2
            }}
          >
            <Popup>
              <strong>{report.title}</strong>
              <br />
              <span>{incidentCategoryLabels[report.category]}</span>
              <br />
              {report.detail}
              <br />
              <span>{formatRelativeTime(report.createdAt)} • {report.moderationStatus.replace(/_/g, " ")}</span>
              <br />
              <span>{report.evidence === "text_image" ? "Text + image evidence" : "Text evidence"} • {report.isSeeded ? "seeded demo record" : "browser-local report"}</span>
              {report.imageDataUrl && (
                <>
                  <br />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" src={report.imageDataUrl} className="mt-2 max-h-28 max-w-40 rounded object-cover" />
                </>
              )}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "time unknown";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function MapUpdater({ center, selected }: { center: Coordinates; selected?: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    const target = selected ?? center;
    map.flyTo([target.lat, target.lng], selected ? 14 : 12, { duration: 0.7 });
  }, [center, selected, map]);

  return null;
}
