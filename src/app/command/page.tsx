import Link from "next/link";
import { Suspense } from "react";
import { listEvents } from "@/lib/repo";
import { getEventDashboard, resolveEvent } from "@/lib/dashboard";
import { departmentLabel, patientTypeLabel, symptomLabel, symptomsOf, PATIENT_TYPES } from "@/lib/constants";
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
    listEvents(),
  ]);
  const alertStations = new Set(d.alerts.filter((a) => a.level === "danger").map((a) => a.stationId));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>{event.name}</h1>
          <p className="text-sm text-slate-600">{event.venue}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <EventPicker events={events.map((e) => ({ id: e.id, name: e.name }))} current={event.id} />
          </Suspense>
          <AutoRefresh seconds={10} />
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${d.wheelchairs.length ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
        <StatTile label="累計人次" value={d.totals.total} />
        <StatTile label="留站觀察" value={d.totals.observing} tone={d.totals.observing ? "warning" : "default"} />
        <StatTile label="後送醫院" value={d.totals.transferred} tone={d.totals.transferred ? "danger" : "default"} />
        <StatTile label="待處理申請" value={d.pendingRequests} tone={d.pendingRequests ? "danger" : "default"} />
        {d.wheelchairs.length > 0 && (
          <StatTile label="今日輪椅借出" value={d.wheelchairsToday} hint={`借出中 ${d.openLoans.length} 台`} />
        )}
      </div>

      <section className="card" aria-live="polite">
        <h2 className="mb-2">警告（{d.alerts.length}）</h2>
        {d.alerts.length === 0 ? (
          <p className="text-sm text-green-700">✓ 目前無警告</p>
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

      {d.wheelchairs.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="mb-2">♿ 輪椅</h2>
          <table className="table">
            <thead>
              <tr>
                <th>站點</th>
                <th className="text-right">配置</th>
                <th className="text-right">今日借出</th>
                <th className="text-right">借出中</th>
                <th className="text-right">可借</th>
              </tr>
            </thead>
            <tbody>
              {d.wheelchairs.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="text-right tabular-nums">{c.allocated}</td>
                  <td className="text-right tabular-nums">{c.today}</td>
                  <td className="text-right tabular-nums">{c.out}</td>
                  <td className={`text-right font-bold tabular-nums ${c.available > 0 ? "text-green-700" : "text-red-700"}`}>{c.available}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td>合計</td>
                <td className="text-right tabular-nums">{d.wheelchairs.reduce((s, c) => s + c.allocated, 0)}</td>
                <td className="text-right tabular-nums">{d.wheelchairsToday}</td>
                <td className="text-right tabular-nums">{d.wheelchairs.reduce((s, c) => s + c.out, 0)}</td>
                <td className="text-right tabular-nums">{d.wheelchairs.reduce((s, c) => s + c.available, 0)}</td>
              </tr>
            </tbody>
          </table>
          {d.openLoans.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">借用中名單（{d.openLoans.length}）</summary>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {d.openLoans.map((l) => (
                  <li key={l.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span>
                      {l.borrowerName}　{l.borrowerPhone}
                    </span>
                    <span className="text-slate-500">
                      {l.stationName}借出・{formatAgo(l.borrowedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

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

      <div className="grid gap-3 md:grid-cols-2">
        <BarList
          title="科別"
          data={d.byDepartment}
          order={d.byDepartment.UNKNOWN ? ["MEDICAL", "SURGICAL", "UNKNOWN"] : ["MEDICAL", "SURGICAL"]}
          labelOf={departmentLabel}
        />
        <BarList title="身分" data={d.byPatientType} order={PATIENT_TYPES.map((c) => c.value)} labelOf={patientTypeLabel} />
        <BarList title="內科症狀" data={pick(d.byCategory, symptomsOf("MEDICAL"))} labelOf={symptomLabel} />
        <BarList title="外科症狀" data={pick(d.byCategory, symptomsOf("SURGICAL"))} labelOf={symptomLabel} />
      </div>
    </>
  );
}

/** 只取某科別的症狀統計 */
function pick(counts: Record<string, number>, symptoms: readonly { value: string }[]) {
  return Object.fromEntries(symptoms.filter((s) => counts[s.value]).map((s) => [s.value, counts[s.value]]));
}
