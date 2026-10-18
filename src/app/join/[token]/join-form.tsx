"use client";

import { useActionState } from "react";
import { joinStation } from "@/app/actions/auth";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinStation.bind(null, token), {});
  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="您的稱呼或代號" name="reporterName" state={state} hint="例如：王小明、醫務士A，會記錄在您登記的資料上">
        <input id="reporterName" name="reporterName" className="input" maxLength={30} required autoFocus />
      </Field>
      <SubmitButton className="btn-primary w-full" pending={pending}>進入站點</SubmitButton>
    </ActionForm>
  );
}
