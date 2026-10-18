import "server-only";
import { addAuditLog } from "./repo";
import type { SessionPayload } from "./session";

export async function audit(
  session: Pick<SessionPayload, "name" | "role">,
  action: string,
  entity: string,
  entityId = "",
  detail?: unknown,
) {
  await addAuditLog({
    actor: session.name,
    role: session.role,
    action,
    entity,
    entityId,
    detail: detail === undefined ? "" : JSON.stringify(detail),
  });
}
