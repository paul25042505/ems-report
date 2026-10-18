import { NextResponse, type NextRequest } from "next/server";
import { canAccess, requiredRoles } from "@/lib/access";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// 第一道防線：依角色擋路由。頁面與 server action 內仍會再次向資料庫確認身分。
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!requiredRoles(pathname)) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (canAccess(session?.role, pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/station/:path*", "/command/:path*", "/admin/:path*", "/api/export/:path*"],
};
