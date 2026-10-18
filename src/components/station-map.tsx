"use client";

import dynamic from "next/dynamic";
import type { MapStation } from "./station-map-inner";

// Leaflet 需要 window，只在瀏覽器端載入
const Inner = dynamic(() => import("./station-map-inner"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">地圖載入中…</div>,
});

export function StationMap({ stations }: { stations: MapStation[] }) {
  if (stations.length === 0) {
    return <p className="text-sm text-slate-500">尚未設定任何站點座標（可在「系統管理」編輯站點經緯度）。</p>;
  }
  return <Inner stations={stations} />;
}
