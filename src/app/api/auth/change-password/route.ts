import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/session";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

export async function POST(req: NextRequest) {
  // 端末を放置している隙に現在のパスワードを総当たりされることを防ぐ
  const { allowed } = checkRateLimit(`change-password:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "現在のパスワードと新しいパスワードを入力してください。" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8 || newPassword.length > 200) {
    return NextResponse.json(
      { error: "新しいパスワードは8文字以上で入力してください。" },
      { status: 400 }
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "現在のパスワードと同じものは設定できません。" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // セッションを乗っ取られただけでパスワードを変更されないよう、必ず現在のパスワードを確認する
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "現在のパスワードが正しくありません。" }, { status: 401 });
  }

  // sessionVersionをインクリメントし、変更前に発行された他端末のトークンを無効化する
  // （このリクエスト自身には新バージョン入りのトークンを発行し直すので、今の端末は
  // ログインしたままになる）
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      // 仮パスワードでのログイン中だった場合は、ここで通常の状態に戻す
      mustChangePassword: false,
      tempPasswordExpiresAt: null,
      sessionVersion: { increment: 1 },
    },
  });

  // 変更後も操作中の端末はログインしたままにする（セッションを新しく発行し直す）
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(userId, updated.sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
