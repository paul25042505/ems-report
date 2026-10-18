import { listStations } from "@/lib/repo";
import { resolveEvent } from "@/lib/dashboard";
import { findPatients, type PatientFilter } from "@/lib/patient-query";
import {
  CATEGORIES,
  DISPOSITIONS,
  ageGroupLabel,
  categoryLabel,
  patientTypeLabel,
  sexLabel,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { DispositionBadge } from "@/components/badges";
import { AutoRefresh } from "@/components/auto-refresh";
import { NoEvent } from "../no-event";

export const dynamic = "force-dynamic";

export default async function CommandPatientsPage({ searchParams }: { searchParams: Promise<PatientFilter> }) {
  const filter = await searchParams;
  const event = await resolveEvent(filter.event);
  if (!event) return <NoEvent />;

  const [patients, stations] = await Promise.all([
    findPatients(event.id, filter),
    listStations(event.id),
  ]);
  const query = new URLSearchParams(Object.entries({ ...filter, event: event.id }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>傷患紀錄</h1>
          <p className="text-sm text-slate-600">{event.name}｜共 {patients.length} 筆</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh seconds={15} />
          <a href={`/api/export/patients?${query}`} className="btn-dark btn-sm">
            ⬇ 匯出 CSV
          </a>
        </div>
      </div>

      <form className="card grid grid-cols-2 gap-3 md:grid-cols-4" method="get">
        <input type="hidden" name="event" value={event.id} />
        <select name="station" defaultValue={filter.station ?? ""} className="input" aria-label="站點">
          <option value="">全部站點</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={filter.category ?? ""} className="input" aria-label="傷病類別">
          <option value="">全部類別</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="disposition" defaultValue={filter.disposition ?? ""} className="input" aria-label="去向">
          <option value="">全部去向</option>
          {DISPOSITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button className="btn-secondary">篩選</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>到站</th>
              <th>站點</th>
              <th>姓名</th>
              <th>類別</th>
              <th>身分／性別／年齡</th>
              <th>主訴</th>
              <th>處置</th>
              <th>去向</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  沒有符合條件的紀錄
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap tabular-nums">{formatDateTime(p.arrivedAt)}</td>
                <td className="whitespace-nowrap">{p.station.name}</td>
                <td className="whitespace-nowrap">{p.name || "—"}</td>
                <td className="whitespace-nowrap">{categoryLabel(p.category)}</td>
                <td className="whitespace-nowrap">
                  {patientTypeLabel(p.patientType)}／{sexLabel(p.sex)}／{p.age != null ? `${p.age} 歲` : ageGroupLabel(p.ageGroup)}
                </td>
                <td className="min-w-40">{p.complaint}</td>
                <td className="min-w-40">{p.treatment}</td>
                <td className="whitespace-nowrap">
                  <DispositionBadge value={p.disposition} />
                  {p.disposition === "TRANSFERRED" && (
                    <span className="block text-xs text-slate-600">
                      {p.hospital} {p.ambulance}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
