"use client";

import { useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/validation";

/**
 * 以 onSubmit 呼叫 server action。React 19 的 <form action> 在送出後會清空欄位，
 * 驗證失敗時使用者得重填；這裡改成手動送出，保留已輸入的內容。
 */
export function ActionForm({
  action,
  children,
  className,
  resetOn,
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
  className?: string;
  /** 傳入 action 的回傳狀態：成功（ok）時清空表單，適用於「新增」類表單 */
  resetOn?: ActionState;
}) {
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOn?.ok) ref.current?.reset();
  }, [resetOn]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "處理中…",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  /** 搭配 ActionForm 時由 useActionState 傳入；一般 <form action> 會自動偵測 */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 ring-1 ring-green-200">
        {state.message}
      </p>
    );
  }
  return null;
}

export function Field({
  label,
  name,
  id = name,
  state,
  children,
  hint,
}: {
  label: string;
  name: string;
  /** 對應輸入框的 id；同一頁有多個表單時需加前綴避免重複 */
  id?: string;
  state?: ActionState;
  children: React.ReactNode;
  hint?: string;
}) {
  const error = state?.fieldErrors?.[name];
  return (
    // min-w-0：放在 grid 內時允許縮小，避免內容撐寬版面
    <div className="min-w-0">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

/** 大按鈕單選，手機上比下拉選單好點 */
export function ChoiceGroup<T extends string | number>({
  name,
  options,
  defaultValue,
  columns = 3,
  colorOf,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  defaultValue?: T;
  columns?: 2 | 3 | 4 | 5;
  colorOf?: (value: T) => string;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4", 5: "grid-cols-5" }[columns];
  return (
    <div className={`grid gap-2 ${cols}`} role="radiogroup" id={name}>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
          <span
            className={`flex min-h-11 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold ring-1 ring-slate-300 peer-checked:ring-4 peer-checked:ring-slate-900 peer-focus-visible:outline-2 ${
              colorOf ? colorOf(o.value) : "bg-white peer-checked:bg-slate-900 peer-checked:text-white"
            }`}
          >
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
