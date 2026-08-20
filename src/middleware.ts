import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/signup", "/sponsors"];
// これらは独自のBearerトークン認証（CRON_SECRET / ADMIN_SECRET）を各ルート側で行うため、
// ログインセッションによるゲートの対象外にする。
// /api/sponsors は協賛企業が未ログインでも掲載内容を確認できるよう公開する。
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/cron/", "/api/admin/", "/api/sponsors"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const userId = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (userId) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Next.js内部アセット・PWA関連の静的ファイル・広告配信の審査用ファイルは除外する
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png|ads.txt).*)",
  ],
};
