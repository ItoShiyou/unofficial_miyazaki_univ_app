import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// /browse は未登録の見込みユーザーが「サインアップ前に価値を確認できる」ようにする
// 読み取り専用のシラバス検索プレビュー画面。実データレビューにより、直接競合の
// Penmarkはサインアップ不要で利用開始できる一方、本アプリは全機能がログイン必須で、
// 冷スタートのキャンパスほど離脱の摩擦になりやすいと判明したための対応。
// /jobs は求人・インターン・説明会の掲示板（募集情報等提供、docs/pivot_story.md 9-1節）。
// 企業側の掲載情報のみを扱い学生の個人情報は一切含まないため、/sponsorsと同様に
// 未ログインの見込みユーザー・企業にも公開する。
// /admin は運営（学生開発者本人）向けの管理画面。学生アカウントでのログインは
// 前提にせず、画面側でADMIN_SECRETの入力を求めて各API呼び出しに使う設計のため、
// ここで学生ログイン必須のゲート対象から外す（画面自体は秘密の入力が無ければ
// 何も操作できず、既存の管理APIがBearer認証で保護している）。
const PUBLIC_PATHS = ["/login", "/signup", "/sponsors", "/install", "/browse", "/jobs", "/privacy", "/admin"];
// これらは独自のBearerトークン認証（CRON_SECRET / ADMIN_SECRET）を各ルート側で行うため、
// ログインセッションによるゲートの対象外にする。
// /api/sponsors・/api/jobs は協賛企業・求人企業が未ログインでも掲載内容を確認できるよう公開する。
// /api/syllabus/search は個人を特定する情報を含まず、匿名集計（平均評価・件数）のみを
// 返すため公開する。自由記述コメント本文を含む /api/karte は引き続きログイン必須のまま。
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/admin/",
  "/api/sponsors",
  "/api/jobs",
  "/api/syllabus/search",
];

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
