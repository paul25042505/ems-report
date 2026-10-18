import Link from "next/link";
import { getActiveEvent } from "@/lib/dashboard";
import { listStations } from "@/lib/repo";
import { StationStatusBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function StationPicker() {
  const event = await getActiveEvent();
  const stations = event ? await listStations(event.id) : [];

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">選擇救護站</h1>
          {event && <p className="text-sm text-slate-600">{event.name}</p>}
        </div>
        <Link href="/" className="btn-secondary btn-sm">
          回首頁
        </Link>
      </div>
      {stations.length === 0 ? (
        <p className="card text-slate-600">尚未設定救護站，請指揮中心到「系統管理」新增。</p>
      ) : (
        <ul className="grid gap-3">
          {stations.map((s) => (
            <li key={s.id}>
              <Link href={`/station/${s.id}`} className="card flex items-center justify-between gap-3 py-5 hover:ring-2 hover:ring-red-600">
                <span>
                  <span className="block text-xl font-bold">{s.name}</span>
                  {s.location && <span className="block text-sm text-slate-600">{s.location}</span>}
                </span>
                <StationStatusBadge status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
