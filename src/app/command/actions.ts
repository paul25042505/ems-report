"use server";

import { revalidatePath } from "next/cache";
import { getRequest, updateRequest as saveRequest } from "@/lib/repo";
import { audit } from "@/lib/audit";
import { COMMAND_ACTOR } from "@/lib/context";
import { parseForm, requestUpdateSchema, type ActionState } from "@/lib/validation";

export async function updateRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(requestUpdateSchema, formData);
  if (!parsed.success) return parsed.state;
  const { id, status, response } = parsed.data;

  const existing = await getRequest(id);
  if (!existing) return { error: "找不到這筆申請" };
  await saveRequest(id, { status, response, handlerName: COMMAND_ACTOR.name });
  await audit(COMMAND_ACTOR, "處理支援申請", "SupportRequest", id, { status, response });
  revalidatePath("/command/requests");
  return { ok: true, message: "已更新" };
}
