import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import { toggleUser } from "../actions";
import { ResetPasswordForm, UserForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireRole("ADMIN");
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <section className="card overflow-x-auto">
        <h1 className="mb-2">帳號管理</h1>
        <p className="mb-3 text-sm text-slate-600">此處管理指揮中心與管理員帳號。站點人員以各站 QR Code 登入，不需要帳號。</p>
        <table className="table">
          <thead>
            <tr>
              <th>帳號</th>
              <th>顯示名稱</th>
              <th>角色</th>
              <th>狀態</th>
              <th>建立時間</th>
              <th>重設密碼</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-slate-400"}>
                <td className="font-mono">{u.username}</td>
                <td>{u.displayName}</td>
                <td>{ROLE_LABELS[u.role as Role]}</td>
                <td>{u.active ? "啟用" : "已停用"}</td>
                <td className="whitespace-nowrap">{formatDateTime(u.createdAt)}</td>
                <td>
                  <ResetPasswordForm userId={u.id} />
                </td>
                <td>
                  {u.id !== session.uid && (
                    <form action={toggleUser.bind(null, u.id)}>
                      <button className="btn-secondary btn-sm">{u.active ? "停用" : "啟用"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2 className="mb-2">新增帳號</h2>
        <UserForm />
      </section>
    </>
  );
}
