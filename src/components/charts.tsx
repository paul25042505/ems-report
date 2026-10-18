// 單一數列的長條圖：用 CSS 繪製，單一色相、數值直接標示，不需圖例。

export function BarList({
  title,
  data,
  labelOf,
  order,
  colorOf,
}: {
  title: string;
  data: Record<string, number>;
  labelOf: (key: string) => string;
  /** 固定顯示順序（含 0 的項目）；省略時依數量排序 */
  order?: readonly (string | number)[];
  /** 有語意的顏色（例如檢傷分級），省略時使用單一中性色 */
  colorOf?: (key: string) => string;
}) {
  const keys = order ? order.map(String) : Object.keys(data).sort((a, b) => data[b] - data[a]);
  const max = Math.max(1, ...keys.map((k) => data[k] ?? 0));
  const total = keys.reduce((s, k) => s + (data[k] ?? 0), 0);
  return (
    <section className="card">
      <h2 className="mb-3 text-base">{title}</h2>
      {total === 0 ? (
        <p className="text-sm text-slate-500">尚無資料</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => {
            const v = data[k] ?? 0;
            return (
              <li key={k} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm" title={`${labelOf(k)}：${v} 人`}>
                <span className="truncate text-slate-700">{labelOf(k)}</span>
                <span className="h-4 rounded-sm bg-slate-100">
                  <span
                    className={`block h-4 rounded-r ${colorOf ? colorOf(k) : "bg-slate-600"}`}
                    style={{ width: `${(v / max) * 100}%` }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">{v}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function HourlyChart({ data }: { data: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const peak = data.reduce((p, d) => (d.count > p.count ? d : p), data[0] ?? { label: "", count: 0 });
  return (
    <section className="card">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base">每小時到站人次</h2>
        {data.length > 0 && (
          <p className="text-xs text-slate-500">
            尖峰 {peak.label}：{peak.count} 人
          </p>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">尚無資料</p>
      ) : (
        <div className="overflow-x-auto">
          {/* 每個時段一欄：數值、長條、時段標籤放在同一欄，確保對齊 */}
          <div className="flex min-w-full gap-[2px]" style={{ width: `${data.length * 2.5}rem` }}>
            {data.map((d) => (
              <div key={d.key} className="group flex flex-1 flex-col" title={`${d.label}：${d.count} 人`}>
                <div className="flex h-44 flex-col justify-end border-b border-slate-300">
                  <span className="mb-0.5 text-center text-xs font-semibold text-slate-700 tabular-nums">{d.count || ""}</span>
                  <span className="mx-auto block w-full max-w-12 rounded-t bg-red-700 group-hover:bg-red-900" style={{ height: `${(d.count / max) * 80}%` }} />
                </div>
                <span className="pt-1 text-center text-[11px] whitespace-nowrap text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function StatTile({ label, value, tone = "default", hint }: { label: string; value: number; tone?: "default" | "danger" | "warning"; hint?: string }) {
  const toneClass = { default: "text-slate-900", danger: "text-red-700", warning: "text-amber-700" }[tone];
  return (
    <div className="card">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
