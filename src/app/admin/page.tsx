import Link from "next/link";
import { countPatients, countStations, listEvents, listStations } from "@/lib/repo";
import { toLocalDateInput } from "@/lib/time";
import { StationStatusBadge } from "@/components/badges";
import { activateEvent, moveStation } from "./actions";
import { EventForm, ResetEventForm, StationForm } from "./admin-forms";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams;
  const events = await Promise.all(
    (await listEvents()).map(async (e) => ({ ...e, _count: { stations: await countStations(e.id) } })),
  );
  const selected = events.find((e) => e.id === eventId) ?? events.find((e) => e.isActive) ?? events[0];
  const stations = selected
    ? await Promise.all(
        (await listStations(selected.id)).map(async (s) => ({ ...s, _count: { patients: await countPatients(s.id) } })),
      )
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <aside className="min-w-0 space-y-4">
        <section className="card">
          <h2 className="mb-2">活動場次</h2>
          {events.length === 0 && <p className="text-sm text-slate-500">尚無場次，請先建立。</p>}
          <ul className="space-y-1">
            {events.map((e) => (
              <li key={e.id} className={`rounded-lg p-2 ${e.id === selected?.id ? "bg-red-50 ring-1 ring-red-200" : ""}`}>
                <Link href={`/admin?event=${e.id}`} className="block font-semibold hover:underline">
                  {e.name}
                </Link>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {toLocalDateInput(e.startDate)}｜{e._count.stations} 站
                  </span>
                  {e.isActive ? (
                    <span className="rounded bg-green-100 px-1.5 font-bold text-green-800">使用中</span>
                  ) : (
                    <form action={activateEvent.bind(null, e.id)}>
                      <button className="text-red-700 hover:underline">設為使用中</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2">建立新場次</h2>
          <EventForm key={events.length} />
        </section>
      </aside>

      {selected && (
        <div className="min-w-0 space-y-4">
          <section className="card">
            <h2 className="mb-2">場次資料</h2>
            <EventForm
              key={selected.id}
              event={{
                id: selected.id,
                name: selected.name,
                venue: selected.venue,
                startDate: toLocalDateInput(selected.startDate),
                endDate: toLocalDateInput(selected.endDate),
              }}
            />
          </section>

          <section className="card overflow-x-auto">
            <h2 className="mb-2">救護站</h2>
            <table className="table">
              <thead>
                <tr>
                  <th className="w-20">順序</th>
                  <th>站名</th>
                  <th>位置</th>
                  <th>狀態</th>
                  <th>負責人</th>
                  <th className="text-right">傷患</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500">
                      尚未設定救護站
                    </td>
                  </tr>
                )}
                {stations.map((s, i) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">
                      <form action={moveStation.bind(null, s.id, "up")} className="inline">
                        <button className="btn-secondary btn-sm w-8 px-0" disabled={i === 0} aria-label={`${s.name} 上移`}>
                          ↑
                        </button>
                      </form>{" "}
                      <form action={moveStation.bind(null, s.id, "down")} className="inline">
                        <button className="btn-secondary btn-sm w-8 px-0" disabled={i === stations.length - 1} aria-label={`${s.name} 下移`}>
                          ↓
                        </button>
                      </form>
                    </td>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.location}</td>
                    <td>
                      <StationStatusBadge status={s.status} />
                    </td>
                    <td>
                      {s.contactName} {s.contactPhone}
                    </td>
                    <td className="text-right tabular-nums">{s._count.patients}</td>
                    <td className="text-right whitespace-nowrap">
                      <Link href={`/admin/stations/${s.id}`} className="btn-secondary btn-sm">
                        編輯
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2 className="mb-2">新增救護站</h2>
            <StationForm eventId={selected.id} />
          </section>

          <section className="card space-y-2 ring-2 ring-red-200">
            <h2>清除測試資料</h2>
            <p className="text-sm text-slate-600">
              正式活動前，可把「{selected.name}」恢復成剛建立好救護站時的樣子：
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>刪除所有傷患紀錄、支援申請</li>
              <li>每站物資恢復預設品項與數量，站點改回「開設中」並清除最後回報時間</li>
              <li>保留：救護站設定、場次、登入名單、操作紀錄</li>
            </ul>
            <p className="text-sm font-semibold text-red-700">
              此動作無法復原。需要保留的資料請先到「傷患紀錄」匯出 CSV。
            </p>
            <ResetEventForm eventId={selected.id} eventName={selected.name} />
          </section>
        </div>
      )}
    </div>
  );
}
