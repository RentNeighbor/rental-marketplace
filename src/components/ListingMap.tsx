"use client";

import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const RADIUS_METERS = 805; // 0.5 miles

// Deterministically fuzz coordinates so exact location can't be pinpointed.
// Uses listing ID as a consistent seed — same offset every render, different per listing.
function fuzzCoords(lat: number, lng: number, listingId: string): [number, number] {
  const seed = parseInt(listingId.replace(/-/g, "").substring(0, 8), 16);
  const latOffset = ((seed % 1000) - 500) / 55000; // ±~0.9 km
  const lngOffset = (((seed >> 10) % 1000) - 500) / 55000;
  return [lat + latOffset, lng + lngOffset];
}

export default function ListingMap({
  lat,
  lng,
  listingId,
}: {
  lat: number;
  lng: number;
  listingId: string;
}) {
  const [fLat, fLng] = fuzzCoords(lat, lng, listingId);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 220 }}>
      <MapContainer
        center={[fLat, fLng]}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Circle
          center={[fLat, fLng]}
          radius={RADIUS_METERS}
          pathOptions={{
            color: "#2563eb",
            weight: 1.5,
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
          }}
        />
      </MapContainer>
    </div>
  );
}
