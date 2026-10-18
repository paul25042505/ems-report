import { listAuditLogs } from "@/lib/repo";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await listAuditLogs(300);
  return (
    <section className="card overflow-x-auto">
      <h1 className="mb-2">操作紀錄</h1>
      <p className="mb-3 text-sm text-slate-600">顯示最近 300 筆。</p>
      <table className="table">
        <thead>
          <tr>
            <th>時間</th>
            <th>操作者</th>
            <th>動作</th>
            <th>對象</th>
            <th>內容</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap tabular-nums">{formatDateTime(l.createdAt)}</td>
              <td className="whitespace-nowrap">
                {l.actor}
                <span className="block text-xs text-slate-500">{ROLE_LABELS[l.role as Role] ?? l.role}</span>
              </td>
              <td className="whitespace-nowrap">{l.action}</td>
              <td className="font-mono text-xs whitespace-nowrap">{l.entity}</td>
              <td className="max-w-md truncate font-mono text-xs text-slate-600" title={l.detail}>
                {l.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
