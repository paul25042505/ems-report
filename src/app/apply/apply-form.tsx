"use client";

import { useActionState } from "react";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { applyForAccount } from "./actions";

export function ApplyForm({ defaults }: { defaults: { unit?: string; rank?: string; name?: string } }) {
  const [state, action, pending] = useActionState(applyForAccount, {});
  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="單位" name="unit" state={state}>
        <input id="unit" name="unit" className="input" maxLength={50} defaultValue={defaults.unit} placeholder="例：國軍○○醫院" required />
      </Field>
      <Field label="級職" name="rank" state={state}>
        <input id="rank" name="rank" className="input" maxLength={30} defaultValue={defaults.rank} placeholder="例：上士／醫務士" required />
      </Field>
      <Field label="姓名" name="name" state={state}>
        <input id="name" name="name" className="input" maxLength={30} defaultValue={defaults.name} required />
      </Field>
      <SubmitButton className="btn-primary w-full" pending={pending}>
        送出申請
      </SubmitButton>
    </ActionForm>
  );
}
