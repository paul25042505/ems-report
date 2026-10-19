import type { MemberRole } from "./constants";
import { adminAuth } from "./firestore";
import { emailId, getAllowedRoles } from "./repo";

export const SESSION_COOKIE = "__session";
/** 登入有效期間 */
export const SESSION_MS = 7 * 24 * 3600 * 1000;

/** 系統擁有者：一定可以登入、擁有全部角色，且不能從名單移除（環境變數 OWNER_EMAILS，逗號分隔） */
export function ownerEmails() {
  return (process.env.OWNER_EMAILS ?? "").split(",").map(emailId).filter(Boolean);
}

const ALL_ROLES: MemberRole[] = ["COMMAND", "STATION"];

/** 各路徑需要的角色 */
const PATH_ROLES: { prefix: string; role: MemberRole }[] = [
  { prefix: "/command", role: "COMMAND" },
  { prefix: "/admin", role: "COMMAND" },
  { prefix: "/api/export", role: "COMMAND" },
  { prefix: "/station", role: "STATION" },
];

export function requiredRole(pathname: string): MemberRole | null {
  return PATH_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))?.role ?? null;
}

// 名單查詢結果快取 60 秒，避免每個請求都讀 Firestore；移出名單或改角色後最多 1 分鐘生效
const cache = new Map<string, { roles: MemberRole[] | null; at: number }>();
const CACHE_MS = 60_000;

/** 取得帳號的角色；不在名單上回傳 null */
export async function rolesOf(email: string): Promise<MemberRole[] | null> {
  const id = emailId(email);
  if (ownerEmails().includes(id)) return ALL_ROLES;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.roles;
  const stored = await getAllowedRoles(id);
  const roles = stored === null ? null : ALL_ROLES.filter((r) => stored.includes(r));
  cache.set(id, { roles, at: Date.now() });
  return roles;
}

export function forgetAllowed(email: string) {
  cache.delete(emailId(email));
}

export type SessionUser = { email: string; name: string; roles: MemberRole[] };

/** 驗證 session cookie，並確認帳號仍在名單上 */
export async function verifySession(cookie: string | undefined): Promise<SessionUser | null> {
  if (!cookie) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie);
    if (!claims.email) return null;
    const roles = await rolesOf(claims.email);
    if (!roles) return null;
    return { email: emailId(claims.email), name: (claims.name as string | undefined) ?? claims.email, roles };
  } catch {
    return null;
  }
}
