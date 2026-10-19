import type { MemberRole } from "./constants";
import { adminAuth } from "./firestore";
import { emailId, getAllowedRole } from "./repo";

export const SESSION_COOKIE = "__session";
/** 登入有效期間 */
export const SESSION_MS = 7 * 24 * 3600 * 1000;

/** 系統擁有者：一定可以登入、角色為指揮中心，且不能從名單移除（環境變數 OWNER_EMAILS，逗號分隔） */
export function ownerEmails() {
  return (process.env.OWNER_EMAILS ?? "").split(",").map(emailId).filter(Boolean);
}

/** 只有指揮中心能進入的路徑 */
const COMMAND_PATHS = ["/command", "/admin", "/api/export"];

export function requiresCommand(pathname: string) {
  return COMMAND_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// 名單查詢結果快取 60 秒，避免每個請求都讀 Firestore；移出名單或改角色後最多 1 分鐘生效
const cache = new Map<string, { role: MemberRole | null; at: number }>();
const CACHE_MS = 60_000;

/** 取得帳號的角色；不在名單上回傳 null */
export async function roleOf(email: string): Promise<MemberRole | null> {
  const id = emailId(email);
  if (ownerEmails().includes(id)) return "COMMAND";
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.role;
  const stored = await getAllowedRole(id);
  const role: MemberRole | null = stored === null ? null : stored === "COMMAND" ? "COMMAND" : "STATION";
  cache.set(id, { role, at: Date.now() });
  return role;
}

export function forgetAllowed(email: string) {
  cache.delete(emailId(email));
}

export type SessionUser = { email: string; name: string; role: MemberRole };

/** 驗證 session cookie，並確認帳號仍在名單上 */
export async function verifySession(cookie: string | undefined): Promise<SessionUser | null> {
  if (!cookie) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie);
    if (!claims.email) return null;
    const role = await roleOf(claims.email);
    if (!role) return null;
    return { email: emailId(claims.email), name: (claims.name as string | undefined) ?? claims.email, role };
  } catch {
    return null;
  }
}
