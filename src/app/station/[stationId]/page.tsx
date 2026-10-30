import Link from "next/link";
import { listLoansByEvent, listPatientsByStation, listStations } from "@/lib/repo";
import { getStationContext } from "@/lib/context";
import { STATION_STATUS, categoryText, displayName } from "@/lib/constants";
import { totals, wheelchairStatus } from "@/lib/summary";
import { formatAgo, formatDateTime, formatTime, startOfLocalDay } from "@/lib/time";
import { DispositionBadge, StationStatusBadge } from "@/components/badges";
import { StatTile } from "@/components/charts";
import { heartbeat, setStationStatus } from "./actions";
import { WheelchairPanel } from "./wheelchair-panel";

export default async function StationHome({
  params,
  searchParams,
}: {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ stationId }, { saved }] = await Promise.all([params, searchParams]);
  const { station } = await getStationContext(stationId);
  const patients = await listPatientsByStation(station.id);
  const today = startOfLocalDay(new Date());
  const todays = patients.filter((p) => p.arrivedAt >= today);
  const t = totals(todays);
  const observing = patients.filter((p) => p.disposition === "OBSERVING");
  const chairs = station.wheelchairs ? await wheelchairData(station.id, station.eventId) : null;
  const others = patients.filter((p) => p.disposition !== "OBSERVING");

  return (
    <>
      {saved && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-800 ring-1 ring-green-200">
          ✓ {{ updated: "紀錄已更新", deleted: "紀錄已刪除" }[saved] ?? "已完成登記"}
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
        <form action={setStationStatus.bind(null, station.id)} className="grid grid-cols-3 gap-2">
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
          <form action={heartbeat.bind(null, station.id)}>
            <button className="btn-secondary btn-sm">✓ 回報平安（無異狀）</button>
          </form>
        </div>
      </section>

      <Link href={`/station/${station.id}/patients/new`} className="btn-primary w-full py-4 text-xl">
        ＋ 登記傷患
      </Link>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="今日人次" value={t.total} />
        <StatTile label="留觀中" value={observing.length} tone={observing.length ? "warning" : "default"} />
        <StatTile label="今日後送" value={t.transferred} tone={t.transferred ? "danger" : "default"} />
      </div>

      {chairs && <WheelchairPanel stationId={station.id} {...chairs} />}

      <PatientList stationId={station.id} title={`留站觀察中（${observing.length}）`} patients={observing} empty="目前沒有留觀傷患" />
      <PatientList stationId={station.id} title={`已離站（${others.length}）`} patients={others} empty="尚無紀錄" />
    </>
  );
}

async function wheelchairData(stationId: string, eventId: string) {
  const [stations, loans] = await Promise.all([listStations(eventId), listLoansByEvent(eventId)]);
  const status = wheelchairStatus(stations, loans).get(stationId)!;
  const names = new Map(stations.map((s) => [s.id, s.name]));
  const open = loans
    .filter((l) => !l.returnedAt)
    .sort((a, b) => Number(b.stationId === stationId) - Number(a.stationId === stationId))
    .map((l) => ({
      id: l.id,
      stationId: l.stationId,
      stationName: names.get(l.stationId) ?? "",
      borrowerName: l.borrowerName,
      borrowerPhone: l.borrowerPhone,
      borrowedAt: `${formatDateTime(l.borrowedAt)}（${formatAgo(l.borrowedAt)}）`,
    }));
  return { ...status, loans: open };
}

function PatientList({
  stationId,
  title,
  patients,
  empty,
}: {
  stationId: string;
  title: string;
  patients: { id: string; arrivedAt: Date; patientType: string; rank?: string; name?: string; age?: number | null; category: string; disposition: string; complaint: string; hospital: string }[];
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
              <Link href={`/station/${stationId}/patients/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                <span className="w-12 text-sm text-slate-500 tabular-nums">{formatTime(p.arrivedAt)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {displayName(p) && `${displayName(p)}・`}
                    {categoryText(p.category)}
                  </span>
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
