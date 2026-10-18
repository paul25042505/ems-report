import "server-only";
import type { Actor } from "./context";
import { addAuditLog } from "./repo";

export async function audit(actor: Actor, action: string, entity: string, entityId = "", detail?: unknown) {
  await addAuditLog({
    actor: actor.name,
    role: actor.role,
    action,
    entity,
    entityId,
    detail: detail === undefined ? "" : JSON.stringify(detail),
  });
}
