import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, requiredRole, verifySession } from "@/lib/access";

/** 除了登入頁與登入 API 外，所有頁面都需要以名單上的 Google 帳號登入；不在名單上的人只能進入申請帳號頁 */
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
  headers.set("x-user-roles", (user.roles ?? []).join(","));

  const isApply = req.nextUrl.pathname === "/apply";
  if (!user.roles) {
    if (isApply) return NextResponse.next({ request: { headers } });
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "帳號尚未核准" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/apply";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (isApply) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 沒有對應角色就擋下：指揮中心／系統管理／匯出需要「指揮中心」，救護站需要「站點人員」
  const need = requiredRole(req.nextUrl.pathname);
  if (need && !user.roles.includes(need)) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "沒有權限" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = `?need=${need}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!login|api/session|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
