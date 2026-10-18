import Link from "next/link";
import { AppHeader, COMMAND_NAV } from "@/components/app-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader subtitle="系統管理" nav={COMMAND_NAV} />
      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <nav className="no-print flex gap-2 text-sm">
          <Link href="/admin" className="btn-secondary btn-sm">
            場次與救護站
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
