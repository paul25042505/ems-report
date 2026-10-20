"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/context";
import { addAuditLog, submitAccountRequest } from "@/lib/repo";
import { accountRequestSchema, parseForm, type ActionState } from "@/lib/validation";

export async function applyForAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user.email) return { error: "請先登入" };
  const parsed = parseForm(accountRequestSchema, formData);
  if (!parsed.success) return parsed.state;
  await submitAccountRequest(user.email, parsed.data);
  await addAuditLog({ actor: `${parsed.data.name}（${user.email}）`, role: "LOGIN", action: "申請帳號", entity: "AccountRequest", entityId: user.email, detail: JSON.stringify(parsed.data) });
  revalidatePath("/apply");
  return { ok: true };
}
