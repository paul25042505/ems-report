"use client";

import { useActionState, useEffect, useState } from "react";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { borrowWheelchair, returnWheelchair } from "./actions";

type OpenLoan = { id: string; stationId: string; stationName: string; borrowerName: string; borrowerPhone: string; borrowedAt: string };

export function WheelchairPanel({
  stationId,
  allocated,
  available,
  out,
  loans,
}: {
  stationId: string;
  allocated: number;
  available: number;
  out: number;
  /** 全場次借用中的輪椅（本站借出的排在前面），任何有輪椅的站都能收還 */
  loans: OpenLoan[];
}) {
  const [state, action, pending] = useActionState(borrowWheelchair.bind(null, stationId), {});
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  // 借出成功後收起表單，顯示成功訊息
  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state]);
  const q = query.trim();
  const shown = q ? loans.filter((l) => l.borrowerName.includes(q) || l.borrowerPhone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || q)) : loans;

  return (
    <section className="card space-y-3">
      <h2>♿ 輪椅借用</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["配置", allocated, "text-slate-900"],
          ["借出中", out, out ? "text-amber-700" : "text-slate-900"],
          ["可借", available, available > 0 ? "text-green-700" : "text-red-700"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="rounded-lg bg-slate-50 py-2">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {showForm ? (
        <ActionForm action={action} resetOn={state} className="space-y-3 rounded-lg bg-slate-50 p-3">
          <FormMessage state={state} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="借用人姓名（選填）" name="borrowerName" id="borrowerName" state={state}>
              <input id="borrowerName" name="borrowerName" className="input" maxLength={30} autoComplete="off" />
            </Field>
            <Field label="電話（選填）" name="borrowerPhone" id="borrowerPhone" state={state}>
              <input id="borrowerPhone" name="borrowerPhone" type="tel" inputMode="tel" className="input" maxLength={20} autoComplete="off" />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
              取消
            </button>
            <SubmitButton className="btn-primary flex-[2]" pending={pending}>
              確認借出
            </SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <>
          {state.message && <FormMessage state={state} />}
          <button type="button" className="btn-dark w-full" disabled={available <= 0} onClick={() => setShowForm(true)}>
            {available > 0 ? "＋ 借出輪椅" : "目前沒有可借的輪椅"}
          </button>
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">借用中（{loans.length}）</h3>
          {loans.length > 3 && (
            <input
              className="input w-40 py-1"
              placeholder="搜尋姓名／電話"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜尋借用人"
            />
          )}
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-slate-500">{loans.length ? "找不到符合的借用人" : "目前沒有借出中的輪椅"}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {l.borrowerName || "（未填姓名）"}　<span className="font-normal text-slate-600">{l.borrowerPhone}</span>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {l.stationId === stationId ? "本站" : l.stationName}借出・{l.borrowedAt}
                  </span>
                </span>
                <form action={returnWheelchair.bind(null, stationId, l.id)}>
                  <button className="btn-secondary btn-sm" aria-label={`${l.borrowerName || "未填姓名"} 歸還`}>
                    歸還
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
