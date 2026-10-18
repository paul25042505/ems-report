import "server-only";
import { db } from "./db";
import type { SessionPayload } from "./session";

export async function audit(
  session: Pick<SessionPayload, "name" | "role">,
  action: string,
  entity: string,
  entityId = "",
  detail?: unknown,
) {
  await db.auditLog.create({
    data: {
      actor: session.name,
      role: session.role,
      action,
      entity,
      entityId,
      detail: detail === undefined ? "" : JSON.stringify(detail),
    },
  });
}
