"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** 定時重新抓取伺服器資料，讓看板保持即時 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [last, setLast] = useState<string>("");

  useEffect(() => {
    setLast(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLast(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [enabled, router, seconds]);

  return (
    <label className="no-print inline-flex items-center gap-2 text-xs text-slate-500">
      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      每 {seconds} 秒自動更新{last && `（${last}）`}
    </label>
  );
}
