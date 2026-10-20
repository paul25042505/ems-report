import { LogoutButton } from "@/components/logout-button";
import { currentUser } from "@/lib/context";
import { getAccountRequest } from "@/lib/repo";
import { formatDateTime } from "@/lib/time";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const user = await currentUser();
  const request = await getAccountRequest(user.email);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-5xl text-red-700">✚</p>
          <h1 className="text-2xl">申請帳號</h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>

        {request?.status === "PENDING" ? (
          <div className="card space-y-2 text-center">
            <p className="text-3xl">⏳</p>
            <h2>審核中</h2>
            <p className="text-sm text-slate-600">
              {request.unit}　{request.rank}　{request.name}
              <br />
              已於 {formatDateTime(request.updatedAt)} 送出，管理員核准後重新整理此頁即可開始使用。
            </p>
          </div>
        ) : (
          <div className="card space-y-3">
            {request?.status === "REJECTED" && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                上次的申請未通過，如有需要請確認資料後重新送出。
              </p>
            )}
            <p className="text-sm text-slate-600">此帳號尚未開通，請填寫以下資料送出申請，經管理員核准後即可使用。</p>
            <ApplyForm defaults={request ?? {}} />
          </div>
        )}

        <div className="text-center text-sm">
          <LogoutButton className="text-red-700 underline" />
        </div>
      </div>
    </main>
  );
}
