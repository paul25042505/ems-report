import { adminAuth } from "./firestore";
import { emailId, isEmailAllowed } from "./repo";

export const SESSION_COOKIE = "__session";
/** 登入有效期間 */
export const SESSION_MS = 7 * 24 * 3600 * 1000;

/** 系統擁有者：一定可以登入，且不能從名單移除（環境變數 OWNER_EMAILS，逗號分隔） */
export function ownerEmails() {
  return (process.env.OWNER_EMAILS ?? "").split(",").map(emailId).filter(Boolean);
}

// 名單查詢結果快取 60 秒，避免每個請求都讀 Firestore；從名單移除後最多 1 分鐘失效
const cache = new Map<string, { allowed: boolean; at: number }>();
const CACHE_MS = 60_000;

export async function isAllowed(email: string) {
  const id = emailId(email);
  if (ownerEmails().includes(id)) return true;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.allowed;
  const allowed = await isEmailAllowed(id);
  cache.set(id, { allowed, at: Date.now() });
  return allowed;
}

export function forgetAllowed(email: string) {
  cache.delete(emailId(email));
}

export type SessionUser = { email: string; name: string };

/** 驗證 session cookie，並確認帳號仍在名單上 */
export async function verifySession(cookie: string | undefined): Promise<SessionUser | null> {
  if (!cookie) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie);
    if (!claims.email || !(await isAllowed(claims.email))) return null;
    return { email: emailId(claims.email), name: (claims.name as string | undefined) ?? claims.email };
  } catch {
    return null;
  }
}
