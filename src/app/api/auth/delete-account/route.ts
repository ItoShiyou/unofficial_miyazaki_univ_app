import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

/**
 * 利用者自身によるアカウント削除。友達解除（サイクル20）と同じ理由で、
 * 「登録はできるが退会はできない」という欠落を埋める。
 *
 * 授業カルテ（CourseKarte）は元々匿名投稿でユーザーと紐付いていないため、
 * ここで削除する対象には含まれない（削除しても他の投稿には一切影響しない）。
 */
export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(`delete-account:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "確認のため、パスワードを入力してください。" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // セッションを乗っ取られただけでアカウントを消されないよう、必ずパスワードを確認する
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "パスワードが正しくありません。" }, { status: 401 });
  }

  // 友達関係は双方向に存在するため両方消す。招待コード・共有時間割・
  // 自分自身の順に削除し、最後にUser本体を削除する。
  await prisma.$transaction([
    prisma.friend.deleteMany({ where: { OR: [{ userId }, { friendUserId: userId }] } }),
    prisma.inviteCode.deleteMany({ where: { userId } }),
    prisma.sharedTimetable.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
