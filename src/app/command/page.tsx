import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getEventDashboard, resolveEvent } from "@/lib/dashboard";
import { CATEGORIES, TRIAGE_LEVELS, categoryLabel, patientTypeLabel, triageLabel, PATIENT_TYPES } from "@/lib/constants";
import { formatAgo } from "@/lib/time";
import { AutoRefresh } from "@/components/auto-refresh";
import { StationStatusBadge } from "@/components/badges";
import { BarList, HourlyChart, StatTile } from "@/components/charts";
import { EventPicker } from "@/components/event-picker";
import { StationMap } from "@/components/station-map";
import { NoEvent } from "./no-event";

export const dynamic = "force-dynamic";

export default async function CommandDashboard({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams;
  const event = await resolveEvent(eventId);
  if (!event) return <NoEvent />;

  const [d, events] = await Promise.all([
    getEventDashboard(event.id),
    db.event.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);
  const alertStations = new Set(d.alerts.filter((a) => a.level === "danger").map((a) => a.stationId));
  const triageColor = (k: string) => k === "5" ? "bg-slate-400" : TRIAGE_LEVELS.find((t) => String(t.value) === k)?.color.split(" ")[0] ?? "bg-slate-600";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>{event.name}</h1>
          <p className="text-sm text-slate-600">{event.venue}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <EventPicker events={events} current={event.id} />
          </Suspense>
          <AutoRefresh seconds={10} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="累計人次" value={d.totals.total} />
        <StatTile label="留站觀察" value={d.totals.observing} tone={d.totals.observing ? "warning" : "default"} />
        <StatTile label="後送醫院" value={d.totals.transferred} tone={d.totals.transferred ? "danger" : "default"} />
        <StatTile label="1-2級重症" value={d.totals.critical} tone={d.totals.critical ? "danger" : "default"} />
        <StatTile label="待處理申請" value={d.pendingRequests} tone={d.pendingRequests ? "danger" : "default"} />
      </div>

      <section className="card" aria-live="polite">
        <h2 className="mb-2">告警（{d.alerts.length}）</h2>
        {d.alerts.length === 0 ? (
          <p className="text-sm text-green-700">✓ 目前無告警</p>
        ) : (
          <ul className="space-y-1">
            {d.alerts.map((a, i) => (
              <li
                key={i}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${a.level === "danger" ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"}`}
              >
                {a.level === "danger" ? "🚨 " : "⚠ "}
                {a.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {d.stations.map((s) => (
          <div key={s.id} className={`card space-y-2 ${alertStations.has(s.id) ? "ring-2 ring-red-500" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2>{s.name}</h2>
                <p className="text-xs text-slate-500">{s.location}</p>
              </div>
              <StationStatusBadge status={s.status} />
            </div>
            <dl className="grid grid-cols-4 gap-1 text-center">
              {[
                ["累計", s.totals.total],
                ["留觀", s.totals.observing],
                ["後送", s.totals.transferred],
                ["申請", s.pendingRequests],
              ].map(([label, value]) => (
                <div key={label} className="rounded bg-slate-50 py-1">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-lg font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {s.lowSupplies.length > 0 && (
              <p className="text-xs font-semibold text-amber-800">物資不足：{s.lowSupplies.map((x) => `${x.name}(${x.quantity})`).join("、")}</p>
            )}
            <p className="text-xs text-slate-500">
              最後回報：{formatAgo(s.lastReportAt)}
              {s.contactName && `｜${s.contactName} ${s.contactPhone}`}
            </p>
            <Link href={`/command/patients?event=${event.id}&station=${s.id}`} className="text-sm font-semibold text-red-700 hover:underline">
              查看傷患紀錄 →
            </Link>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-2">站點位置</h2>
        <StationMap
          stations={d.stations
            .filter((s) => s.lat !== null && s.lng !== null)
            .map((s) => ({
              id: s.id,
              name: s.name,
              status: s.status,
              lat: s.lat!,
              lng: s.lng!,
              total: s.totals.total,
              observing: s.totals.observing,
              alert: alertStations.has(s.id),
            }))}
        />
      </section>

      <HourlyChart data={d.hourly} />

      <div className="grid gap-3 md:grid-cols-3">
        <BarList title="檢傷分級" data={d.byTriage} order={TRIAGE_LEVELS.map((t) => t.value)} labelOf={(k) => triageLabel(Number(k))} colorOf={triageColor} />
        <BarList title="傷病類別" data={d.byCategory} order={CATEGORIES.map((c) => c.value)} labelOf={categoryLabel} />
        <BarList title="身分" data={d.byPatientType} order={PATIENT_TYPES.map((c) => c.value)} labelOf={patientTypeLabel} />
      </div>
    </>
  );
}
