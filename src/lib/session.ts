import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./constants";

export const SESSION_COOKIE = "ems_session";
export const SESSION_HOURS = 14;

export type SessionPayload = {
  role: Role;
  /** 顯示用名稱：帳號的顯示名稱，或站點人員登入時填的稱呼 */
  name: string;
  /** 指揮中心/管理員的帳號 id */
  uid?: string;
  /** 站點人員所屬救護站 */
  stationId?: string;
  /** 登入時的 QR 代碼，站點重新產生代碼後即失效 */
  joinToken?: string;
};

const DEV_SECRET = "dev-only-secret-do-not-use-in-production-0123456789";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET 未設定或長度不足 32 字元");
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
