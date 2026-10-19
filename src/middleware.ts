import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, requiresCommand, verifySession } from "@/lib/access";

/** 除了登入頁與登入 API 外，所有頁面都需要以名單上的 Google 帳號登入 */
export async function middleware(req: NextRequest) {
  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 把登入者傳給頁面與 server action（覆寫外部送來的同名標頭，避免偽造）
  const headers = new Headers(req.headers);
  headers.set("x-user-email", user.email);
  headers.set("x-user-name", encodeURIComponent(user.name));
  headers.set("x-user-role", user.role);

  // 站點人員不能進入指揮中心、系統管理與匯出
  if (user.role !== "COMMAND" && requiresCommand(req.nextUrl.pathname)) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "沒有指揮中心權限" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!login|api/session|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
