import Link from "next/link";

export type NavItem = { href: string; label: string };

export const COMMAND_NAV: NavItem[] = [
  { href: "/command", label: "看板" },
  { href: "/command/patients", label: "傷患紀錄" },
  { href: "/command/requests", label: "支援申請" },
  { href: "/command/summary", label: "成果報告" },
  { href: "/admin", label: "系統管理" },
];

export function AppHeader({ subtitle, nav }: { subtitle?: string; nav: NavItem[] }) {
  return (
    <header className="no-print sticky top-0 z-[1000] bg-red-800 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-bold">✚ 救護站回報系統</p>
          {subtitle && <p className="truncate text-xs text-red-100">{subtitle}</p>}
        </div>
        <Link href="/" className="shrink-0 rounded-md bg-red-900/60 px-3 py-1 text-sm font-semibold hover:bg-red-950">
          回首頁
        </Link>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-1 whitespace-nowrap hover:bg-red-900/60">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
