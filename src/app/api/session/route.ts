import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MS, isAllowed } from "@/lib/access";
import { addAuditLog } from "@/lib/repo";
import { adminAuth } from "@/lib/firestore";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
  sameSite: "lax" as const,
  path: "/",
};

/** 以 Google 登入取得的 ID token 換成 session cookie */
export async function POST(req: NextRequest) {
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: "缺少登入資訊" }, { status: 400 });

  let email: string | undefined;
  let name: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    // 只接受最近 5 分鐘內完成的登入，避免舊 token 被重複使用
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "登入逾時，請重新登入" }, { status: 401 });
    }
    email = decoded.email;
    name = decoded.name as string | undefined;
  } catch {
    return NextResponse.json({ error: "登入驗證失敗，請重新登入" }, { status: 401 });
  }

  if (!email || !(await isAllowed(email))) {
    return NextResponse.json({ error: `${email ?? "此帳號"} 沒有使用權限，請聯絡管理員加入登入名單` }, { status: 403 });
  }

  const session = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MS });
  await addAuditLog({ actor: name ? `${name}（${email}）` : email, role: "LOGIN", action: "登入", entity: "Session", entityId: "", detail: "" });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, { ...cookieOptions, maxAge: SESSION_MS / 1000 });
  return res;
}

/** 登出 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
