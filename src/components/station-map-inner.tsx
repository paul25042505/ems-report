"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { stationStatusLabel } from "@/lib/constants";

export type MapStation = {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  total: number;
  observing: number;
  alert: boolean;
};

const COLOR: Record<string, string> = { OPEN: "#15803d", PAUSED: "#b45309", CLOSED: "#64748b" };

export default function StationMapInner({ stations }: { stations: MapStation[] }) {
  const lat = stations.reduce((s, x) => s + x.lat, 0) / stations.length;
  const lng = stations.reduce((s, x) => s + x.lng, 0) / stations.length;
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="h-72 w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={12}
          pathOptions={{ color: s.alert ? "#b91c1c" : "#ffffff", weight: s.alert ? 4 : 2, fillColor: COLOR[s.status] ?? "#334155", fillOpacity: 0.9 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {s.name}
          </Tooltip>
          <Popup>
            <strong>{s.name}</strong>（{stationStatusLabel(s.status)}）
            <br />
            累計 {s.total} 人，留觀 {s.observing} 人
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
