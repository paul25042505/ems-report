"use client";

import { useActionState, useState } from "react";
import { addSupply, updateSupplyQuantity } from "@/app/station/actions";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";

export function SupplyRow({ supply }: { supply: { id: string; name: string; unit: string; quantity: number; threshold: number } }) {
  const [state, action, pending] = useActionState(updateSupplyQuantity, {});
  const [qty, setQty] = useState(supply.quantity);
  const low = qty <= supply.threshold;
  const dirty = qty !== supply.quantity;

  return (
    <li className="py-3">
      <ActionForm action={action} className="space-y-2">
        <input type="hidden" name="id" value={supply.id} />
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold">
              {supply.name}
              {low && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">⚠ 不足</span>}
            </p>
            <p className="text-xs text-slate-500">
              安全存量 {supply.threshold}
              {supply.unit}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary btn-sm w-10" onClick={() => setQty((q) => Math.max(0, q - 1))} aria-label={`${supply.name} 減少`}>
              −
            </button>
            <input
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
              className="input w-20 text-center"
              aria-label={`${supply.name} 數量`}
            />
            <button type="button" className="btn-secondary btn-sm w-10" onClick={() => setQty((q) => q + 1)} aria-label={`${supply.name} 增加`}>
              ＋
            </button>
            <span className="w-6 text-sm text-slate-600">{supply.unit}</span>
          </div>
        </div>
        {(dirty || state.error) && (
          <div className="flex items-center justify-end gap-2">
            <FormMessage state={state} />
            <SubmitButton className="btn-dark btn-sm" pending={pending}>
              儲存
            </SubmitButton>
          </div>
        )}
      </ActionForm>
    </li>
  );
}

export function AddSupplyForm() {
  const [state, action, pending] = useActionState(addSupply, {});
  return (
    <ActionForm action={action} resetOn={state} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="品項" name="name" state={state}>
          <input id="name" name="name" className="input" maxLength={50} required />
        </Field>
        <Field label="單位" name="unit" state={state}>
          <input id="unit" name="unit" className="input" maxLength={10} placeholder="個" />
        </Field>
        <Field label="目前數量" name="quantity" state={state}>
          <input id="quantity" name="quantity" type="number" min={0} className="input" defaultValue={0} />
        </Field>
        <Field label="安全存量" name="threshold" state={state}>
          <input id="threshold" name="threshold" type="number" min={0} className="input" defaultValue={0} />
        </Field>
      </div>
      <SubmitButton className="btn-secondary" pending={pending}>
        新增品項
      </SubmitButton>
    </ActionForm>
  );
}
