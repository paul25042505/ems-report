import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Role } from "./constants";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type SessionPayload } from "./session";

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * 讀取並向資料庫確認目前登入者仍然有效：
 * 帳號被停用、角色變更，或站點 QR 代碼重新產生，都會讓舊的登入失效。
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  if (session.role === "REPORTER") {
    if (!session.stationId || !session.joinToken) return null;
    const station = await db.station.findUnique({
      where: { id: session.stationId },
      select: { joinToken: true },
    });
    return station?.joinToken === session.joinToken ? session : null;
  }

  if (!session.uid) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active || user.role !== session.role) return null;
  return { ...session, name: user.displayName };
}

export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) redirect("/login");
  return session;
}

export async function requireReporter() {
  const session = await requireRole("REPORTER");
  const station = await db.station.findUniqueOrThrow({
    where: { id: session.stationId! },
    include: { event: true },
  });
  return { session, station };
}
