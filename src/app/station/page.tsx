import Link from "next/link";
import { db } from "@/lib/db";
import { requireReporter } from "@/lib/auth";
import { STATION_STATUS, categoryLabel, triageLabel } from "@/lib/constants";
import { totals } from "@/lib/summary";
import { formatAgo, formatTime, startOfLocalDay } from "@/lib/time";
import { DispositionBadge, StationStatusBadge, TriageBadge } from "@/components/badges";
import { StatTile } from "@/components/charts";
import { heartbeat, setStationStatus } from "./actions";

export default async function StationHome({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { station } = await requireReporter();
  const patients = await db.patient.findMany({ where: { stationId: station.id }, orderBy: { arrivedAt: "desc" } });
  const today = startOfLocalDay(new Date());
  const todays = patients.filter((p) => p.arrivedAt >= today);
  const t = totals(todays);
  const observing = patients.filter((p) => p.disposition === "OBSERVING");
  const others = patients.filter((p) => p.disposition !== "OBSERVING");

  return (
    <>
      {saved && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-800 ring-1 ring-green-200">
          ✓ {saved === "updated" ? "紀錄已更新" : "已完成登記"}
        </p>
      )}

      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl">{station.name}</h1>
            <p className="text-sm text-slate-600">{station.location}</p>
          </div>
          <StationStatusBadge status={station.status} />
        </div>
        <form action={setStationStatus} className="grid grid-cols-3 gap-2">
          {STATION_STATUS.map((s) => (
            <button
              key={s.value}
              name="status"
              value={s.value}
              className={`btn-sm btn ${station.status === s.value ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}
            >
              {s.label}
            </button>
          ))}
        </form>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">最後回報：{formatAgo(station.lastReportAt)}</span>
          <form action={heartbeat}>
            <button className="btn-secondary btn-sm">✓ 回報平安（無異狀）</button>
          </form>
        </div>
      </section>

      <Link href="/station/patients/new" className="btn-primary w-full py-4 text-xl">
        ＋ 登記傷患
      </Link>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="今日人次" value={t.total} />
        <StatTile label="留觀中" value={observing.length} tone={observing.length ? "warning" : "default"} />
        <StatTile label="今日後送" value={t.transferred} tone={t.transferred ? "danger" : "default"} />
      </div>

      <PatientList title={`留站觀察中（${observing.length}）`} patients={observing} empty="目前沒有留觀傷患" />
      <PatientList title={`已離站（${others.length}）`} patients={others} empty="尚無紀錄" />
    </>
  );
}

function PatientList({
  title,
  patients,
  empty,
}: {
  title: string;
  patients: { id: string; arrivedAt: Date; triage: number; category: string; disposition: string; complaint: string; hospital: string }[];
  empty: string;
}) {
  return (
    <section className="card">
      <h2 className="mb-2">{title}</h2>
      {patients.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {patients.map((p) => (
            <li key={p.id}>
              <Link href={`/station/patients/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50" aria-label={`${triageLabel(p.triage)} ${categoryLabel(p.category)}`}>
                <span className="w-12 text-sm text-slate-500 tabular-nums">{formatTime(p.arrivedAt)}</span>
                <TriageBadge level={p.triage} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{categoryLabel(p.category)}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {p.disposition === "TRANSFERRED" ? `→ ${p.hospital}` : p.complaint}
                  </span>
                </span>
                <DispositionBadge value={p.disposition} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
