import { listAllowedUsers, listPendingAccountRequests, rolesOfMember } from "@/lib/repo";
import { ownerEmails } from "@/lib/access";
import { currentUser } from "@/lib/context";
import { formatDateTime } from "@/lib/time";
import { memberRoleLabel } from "@/lib/constants";
import { rejectAccountRequest, removeAllowedUser } from "../actions";
import { AllowedUserForm, ApproveRequestForm, MemberRolesForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default async function AllowedUsersPage() {
  const [users, me, requests] = await Promise.all([listAllowedUsers(), currentUser(), listPendingAccountRequests()]);
  const owners = ownerEmails();

  return (
    <>
      <section className={`card ${requests.length ? "ring-2 ring-amber-400" : ""}`}>
        <h2 className="mb-1">帳號申請（待審核 {requests.length}）</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">目前沒有待審核的申請</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {r.unit}　{r.rank}　{r.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-slate-500">{r.email}</span>
                    <span className="block text-xs text-slate-500">申請於 {formatDateTime(r.updatedAt)}</span>
                  </span>
                  <form action={rejectAccountRequest.bind(null, r.email)}>
                    <button className="btn-secondary btn-sm">拒絕</button>
                  </form>
                </div>
                <ApproveRequestForm email={r.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h1 className="mb-1">登入名單</h1>
        <p className="mb-3 text-sm text-slate-600">
          只有名單上的 Google 帳號可以登入。角色可複選：「指揮中心」可進入看板、傷患紀錄、系統管理；「站點人員」可進入救護站回報。移出名單或變更角色後，最慢 1 分鐘內生效。
        </p>
        <ul className="divide-y divide-slate-100">
          {owners.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 py-2">
              <span className="font-mono text-sm">{email}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">系統擁有者・全部權限</span>
            </li>
          ))}
          {users
            .filter((u) => !owners.includes(u.email))
            .map((u) => (
              <li key={u.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm">{u.email}</span>
                    <span className="block text-xs text-slate-500">
                      {u.note && `${u.note}｜`}加入於 {formatDateTime(u.createdAt)}
                    </span>
                  </span>
                  {u.email === me.email ? (
                    <span className="shrink-0 text-xs text-slate-500">
                      {rolesOfMember(u).map(memberRoleLabel).join("、")}（目前登入）
                    </span>
                  ) : (
                    <form action={removeAllowedUser.bind(null, u.email)}>
                      <button className="btn-secondary btn-sm">移出</button>
                    </form>
                  )}
                </div>
                {u.email !== me.email && <MemberRolesForm email={u.email} roles={rolesOfMember(u)} />}
              </li>
            ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="mb-2">加入帳號</h2>
        <AllowedUserForm />
      </section>
    </>
  );
}
