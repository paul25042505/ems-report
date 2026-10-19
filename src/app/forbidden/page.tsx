import Link from "next/link";

export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const { need } = await searchParams;
  const what = need === "STATION" ? "站點人員" : "指揮中心";
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4 text-center">
        <p className="text-5xl">🔒</p>
        <h1>您沒有{what}的權限</h1>
        <p className="text-sm text-slate-600">此帳號沒有「{what}」角色。需要權限請聯絡管理員。</p>
        <Link href="/" className="btn-primary w-full">
          回首頁
        </Link>
      </div>
    </main>
  );
}
