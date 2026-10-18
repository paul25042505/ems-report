import Link from "next/link";

export function NoEvent() {
  return (
    <div className="card space-y-2">
      <h1>尚未建立活動場次</h1>
      <p className="text-sm text-slate-600">請管理員先到「系統管理」建立場次與救護站。</p>
      <Link href="/admin" className="btn-secondary">
        前往系統管理
      </Link>
    </div>
  );
}
