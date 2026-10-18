"use client";

import { useActionState } from "react";
import { createRequest } from "@/app/station/actions";
import { ActionForm, ChoiceGroup, Field, FormMessage, SubmitButton } from "@/components/forms";
import { REQUEST_TYPES } from "@/lib/constants";

export function RequestForm() {
  const [state, action, pending] = useActionState(createRequest, {});

  return (
    <ActionForm action={action} resetOn={state} className="space-y-4">
      <FormMessage state={state} />
      <Field label="申請類型" name="type" state={state}>
        <ChoiceGroup name="type" options={REQUEST_TYPES} columns={4} />
      </Field>
      <Field label="需求內容" name="content" state={state} hint="例如：飲用水 5 箱、需要 2 名人力、2級傷患需救護車後送">
        <textarea id="content" name="content" className="input" rows={3} maxLength={500} />
      </Field>
      <label className="flex items-center gap-2 font-semibold text-red-700">
        <input type="checkbox" name="urgent" className="h-5 w-5" /> 緊急
      </label>
      <SubmitButton className="btn-primary w-full" pending={pending}>
        送出申請
      </SubmitButton>
    </ActionForm>
  );
}
