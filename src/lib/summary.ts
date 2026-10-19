// 純計算函式（不碰資料庫），供看板、成果報告與單元測試共用。
import { STALE_REPORT_MINUTES, stationStatusLabel, requestTypeLabel } from "./constants";
import { hourKey, minutesSince } from "./time";

export type PatientLite = {
  id: string;
  stationId: string;
  arrivedAt: Date;
  category: string;
  disposition: string;
  patientType: string;
  ageGroup: string;
  sex: string;
  hospital: string;
  departedAt: Date | null;
};

export type StationLite = { id: string; name: string; status: string; lastReportAt: Date | null };
export type SupplyLite = { stationId: string; name: string; unit: string; quantity: number; threshold: number };
export type RequestLite = { id: string; stationId: string; type: string; content: string; urgent: boolean; status: string; createdAt: Date };

export type Totals = {
  total: number;
  observing: number;
  transferred: number;
  released: number;
  refused: number;
};

export function countBy<T>(items: T[], key: (item: T) => string | number) {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = String(key(item));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function totals(patients: PatientLite[]): Totals {
  return {
    total: patients.length,
    observing: patients.filter((p) => p.disposition === "OBSERVING").length,
    transferred: patients.filter((p) => p.disposition === "TRANSFERRED").length,
    released: patients.filter((p) => p.disposition === "RELEASED").length,
    refused: patients.filter((p) => p.disposition === "REFUSED").length,
  };
}

/** 每小時到站人次，中間沒有人的時段補 0，跨日時標籤帶日期 */
export function hourlyCounts(patients: PatientLite[]) {
  if (patients.length === 0) return [];
  const counts = countBy(patients, (p) => hourKey(p.arrivedAt));
  const times = patients.map((p) => p.arrivedAt.getTime());
  const hour = 3600_000;
  const first = Math.floor(Math.min(...times) / hour) * hour;
  const last = Math.floor(Math.max(...times) / hour) * hour;
  const keys: string[] = [];
  for (let t = first; t <= last; t += hour) keys.push(hourKey(new Date(t)));
  const multiDay = new Set(keys.map((k) => k.slice(0, 10))).size > 1;
  return keys.map((k) => ({
    key: k,
    label: multiDay ? `${k.slice(5, 10)} ${k.slice(11)}時` : `${k.slice(11)}時`,
    count: counts[k] ?? 0,
  }));
}

export type Alert = { level: "danger" | "warning"; stationId: string; message: string };

export function computeAlerts(
  input: { stations: StationLite[]; patients: PatientLite[]; supplies: SupplyLite[]; requests: RequestLite[] },
  now = new Date(),
): Alert[] {
  const name = new Map(input.stations.map((s) => [s.id, s.name]));
  const active = new Set(input.stations.filter((s) => s.status !== "CLOSED").map((s) => s.id));
  const alerts: Alert[] = [];

  for (const r of input.requests) {
    if (r.status !== "PENDING") continue;
    if (r.urgent || r.type === "AMBULANCE") {
      alerts.push({
        level: "danger",
        stationId: r.stationId,
        message: `${name.get(r.stationId)}：緊急申請「${requestTypeLabel(r.type)}」待處理 — ${r.content}`,
      });
    }
  }

  for (const p of input.patients) {
    if (p.disposition === "TRANSFERRED" && minutesSince(p.departedAt ?? p.arrivedAt, now) <= 30) {
      alerts.push({
        level: "warning",
        stationId: p.stationId,
        message: `${name.get(p.stationId)}：後送 ${p.hospital || "醫院"}`,
      });
    }
  }

  for (const s of input.supplies) {
    if (active.has(s.stationId) && s.quantity <= s.threshold) {
      alerts.push({
        level: "warning",
        stationId: s.stationId,
        message: `${name.get(s.stationId)}：${s.name} 剩 ${s.quantity}${s.unit}（低於安全存量 ${s.threshold}）`,
      });
    }
  }

  for (const s of input.stations) {
    if (s.status !== "OPEN") continue;
    // 從沒回報過的站不警告，第一次回報後才開始計時
    const stale = s.lastReportAt !== null && minutesSince(s.lastReportAt, now) > STALE_REPORT_MINUTES;
    if (stale) {
      alerts.push({
        level: "warning",
        stationId: s.id,
        message: `${s.name}：超過 ${STALE_REPORT_MINUTES} 分鐘未回報（${stationStatusLabel(s.status)}）`,
      });
    }
  }

  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));
}

/** CSV 欄位跳脫；開頭為 = + - @ 的值加上單引號，避免 Excel 公式注入 */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]) {
  // 加上 BOM，Excel 開啟中文才不會亂碼
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
