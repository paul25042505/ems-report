import { db } from "@/lib/db";
import { requireReporter } from "@/lib/auth";
import { requestTypeLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { RequestStatusBadge } from "@/components/badges";
import { AutoRefresh } from "@/components/auto-refresh";
import { RequestForm } from "./request-form";

export default async function StationRequestsPage() {
  const { station } = await requireReporter();
  const requests = await db.supportRequest.findMany({ where: { stationId: station.id }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <section className="card">
        <h1 className="mb-3">提出支援申請</h1>
        <RequestForm />
      </section>
      <section className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2>申請紀錄</h2>
          <AutoRefresh seconds={20} />
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">尚無申請</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="space-y-1 py-3">
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={r.status} />
                  <span className="font-semibold">{requestTypeLabel(r.type)}</span>
                  {r.urgent && <span className="text-xs font-bold text-red-700">緊急</span>}
                  <span className="ml-auto text-xs text-slate-500">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                {r.response && (
                  <p className="rounded bg-slate-50 px-2 py-1 text-sm text-slate-700">
                    指揮中心{r.handlerName && `（${r.handlerName}）`}：{r.response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
