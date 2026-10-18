import { listRequestsByEvent, listStations } from "@/lib/repo";
import { resolveEvent } from "@/lib/dashboard";
import { requestTypeLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { AutoRefresh } from "@/components/auto-refresh";
import { RequestStatusBadge } from "@/components/badges";
import { NoEvent } from "../no-event";
import { RequestUpdateForm } from "./request-row";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = { PENDING: 0, IN_PROGRESS: 1, DONE: 2 };

export default async function CommandRequestsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams;
  const event = await resolveEvent(eventId);
  if (!event) return <NoEvent />;

  const [all, stations] = await Promise.all([listRequestsByEvent(event.id), listStations(event.id)]);
  const names = new Map(stations.map((s) => [s.id, s.name]));
  const requests = all
    .map((r) => ({ ...r, station: { name: names.get(r.stationId) ?? "" } }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Number(b.urgent) - Number(a.urgent));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1>支援申請</h1>
          <p className="text-sm text-slate-600">{event.name}</p>
        </div>
        <AutoRefresh seconds={10} />
      </div>
      {requests.length === 0 ? (
        <p className="card text-sm text-slate-500">目前沒有申請</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className={`card space-y-2 ${r.status === "PENDING" && r.urgent ? "ring-2 ring-red-500" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={r.status} />
                <span className="font-bold">{r.station.name}</span>
                <span>{requestTypeLabel(r.type)}</span>
                {r.urgent && <span className="rounded bg-red-600 px-1.5 text-xs font-bold text-white">緊急</span>}
                <span className="ml-auto text-xs text-slate-500">
                  {formatDateTime(r.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{r.content}</p>
              {/* key 帶狀態：其他人更新後，自動重新整理時表單跟著重設 */}
              <RequestUpdateForm key={`${r.id}:${r.status}:${r.response}`} id={r.id} status={r.status} response={r.response} />
              {r.handlerName && <p className="text-xs text-slate-500">最後處理：{r.handlerName}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
