import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <>
      <AppHeader session={session} subtitle="系統管理" />
      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <nav className="no-print flex gap-2 text-sm">
          <Link href="/admin" className="btn-secondary btn-sm">
            場次與救護站
          </Link>
          <Link href="/admin/users" className="btn-secondary btn-sm">
            帳號管理
          </Link>
          <Link href="/admin/audit" className="btn-secondary btn-sm">
            操作紀錄
          </Link>
        </nav>
        {children}
      </main>
    </>
  );
}
