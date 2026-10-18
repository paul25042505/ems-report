import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { SessionPayload } from "@/lib/session";

type NavItem = { href: string; label: string };

const NAV: Record<SessionPayload["role"], NavItem[]> = {
  REPORTER: [
    { href: "/station", label: "站點首頁" },
    { href: "/station/supplies", label: "物資" },
    { href: "/station/requests", label: "支援申請" },
  ],
  COMMAND: [
    { href: "/command", label: "看板" },
    { href: "/command/patients", label: "傷患紀錄" },
    { href: "/command/requests", label: "支援申請" },
    { href: "/command/summary", label: "成果報告" },
  ],
  ADMIN: [
    { href: "/command", label: "看板" },
    { href: "/command/patients", label: "傷患紀錄" },
    { href: "/command/requests", label: "支援申請" },
    { href: "/command/summary", label: "成果報告" },
    { href: "/admin", label: "系統管理" },
  ],
};

export function AppHeader({ session, subtitle }: { session: SessionPayload; subtitle?: string }) {
  return (
    <header className="no-print sticky top-0 z-[1000] bg-red-800 text-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-bold">✚ 救護站回報系統</p>
          {subtitle && <p className="truncate text-xs text-red-100">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-red-100 sm:inline">
            {session.name}（{ROLE_LABELS[session.role]}）
          </span>
          <form action={logout}>
            <button className="rounded-md bg-red-900/60 px-3 py-1 font-semibold hover:bg-red-950">登出</button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
        {NAV[session.role].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-1 whitespace-nowrap hover:bg-red-900/60">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
