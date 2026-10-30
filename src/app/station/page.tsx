import Link from "next/link";
import { getActiveEvent } from "@/lib/dashboard";
import { listLoansByEvent, listStations } from "@/lib/repo";
import { wheelchairStatus } from "@/lib/summary";
import { StationStatusBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function StationPicker() {
  const event = await getActiveEvent();
  const [stations, loans] = event ? await Promise.all([listStations(event.id), listLoansByEvent(event.id)]) : [[], []];
  const chairs = wheelchairStatus(stations, loans);

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
                  <WheelchairBadge status={chairs.get(s.id)} />
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

/** 有配置輪椅（或收到別站歸還的輪椅）的站才顯示 */
function WheelchairBadge({ status }: { status?: { allocated: number; available: number } }) {
  if (!status || (status.allocated === 0 && status.available === 0)) return null;
  const none = status.available <= 0;
  return (
    <span
      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-sm font-semibold ${none ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-800"}`}
    >
      ♿ 可借 {status.available}／共 {status.allocated}
    </span>
  );
}
