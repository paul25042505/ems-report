"use client";

import { useActionState } from "react";
import { updateRequest } from "@/app/command/actions";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { REQUEST_STATUS } from "@/lib/constants";

export function RequestUpdateForm({ id, status, response }: { id: string; status: string; response: string }) {
  const [state, action, pending] = useActionState(updateRequest, {});
  return (
    <ActionForm action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} className="input sm:w-32" aria-label="處理狀態">
        {REQUEST_STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <input name="response" defaultValue={response} className="input flex-1" placeholder="回覆站點（例如：已派 2 箱水，約 10 分鐘到）" maxLength={500} aria-label="回覆內容" />
      <SubmitButton className="btn-dark" pending={pending}>
        更新
      </SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
