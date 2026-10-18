"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <ActionForm action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="帳號" name="username" state={state}>
        <input id="username" name="username" className="input" autoComplete="username" required />
      </Field>
      <Field label="密碼" name="password" state={state}>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="btn-primary w-full" pending={pending}>登入</SubmitButton>
    </ActionForm>
  );
}
