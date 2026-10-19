import { listAllowedUsers } from "@/lib/repo";
import { ownerEmails } from "@/lib/access";
import { currentUser } from "@/lib/context";
import { formatDateTime } from "@/lib/time";
import { removeAllowedUser } from "../actions";
import { AllowedUserForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default async function AllowedUsersPage() {
  const [users, me] = await Promise.all([listAllowedUsers(), currentUser()]);
  const owners = ownerEmails();

  return (
    <>
      <section className="card">
        <h1 className="mb-1">登入名單</h1>
        <p className="mb-3 text-sm text-slate-600">只有名單上的 Google 帳號可以登入系統。移出名單後，對方最慢 1 分鐘內會被登出。</p>
        <ul className="divide-y divide-slate-100">
          {owners.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 py-2">
              <span className="font-mono text-sm">{email}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">系統擁有者</span>
            </li>
          ))}
          {users
            .filter((u) => !owners.includes(u.email))
            .map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm">{u.email}</span>
                  <span className="block text-xs text-slate-500">
                    {u.note && `${u.note}｜`}加入於 {formatDateTime(u.createdAt)}
                  </span>
                </span>
                {u.email === me.email ? (
                  <span className="text-xs text-slate-500">（目前登入）</span>
                ) : (
                  <form action={removeAllowedUser.bind(null, u.email)}>
                    <button className="btn-secondary btn-sm">移出</button>
                  </form>
                )}
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
