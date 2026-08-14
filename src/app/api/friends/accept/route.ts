import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

export async function POST(req: NextRequest) {
  // 招待コード（6桁英数字）の総当たりを防ぐため、IPごとに試行回数を制限する
  const { allowed, retryAfterMs } = checkRateLimit(`friends-accept:${clientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。時間をおいて再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { displayName, code } = await req.json();
  if (!displayName || !code) {
    return NextResponse.json({ error: "ニックネームと招待コードが必要です" }, { status: 400 });
  }

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "招待コードが無効か期限切れです" }, { status: 404 });
  }
  if (invite.userId === userId) {
    return NextResponse.json({ error: "自分自身は登録できません" }, { status: 400 });
  }

  const myName = String(displayName).trim().slice(0, 50);

  await prisma.friend.upsert({
    where: { userId_friendUserId: { userId, friendUserId: invite.userId } },
    update: { friendName: invite.displayName },
    create: { userId, friendUserId: invite.userId, friendName: invite.displayName },
  });
  await prisma.friend.upsert({
    where: { userId_friendUserId: { userId: invite.userId, friendUserId: userId } },
    update: { friendName: myName },
    create: { userId: invite.userId, friendUserId: userId, friendName: myName },
  });

  await prisma.inviteCode.delete({ where: { code } });

  return NextResponse.json({ friendName: invite.displayName, friendUserId: invite.userId });
}
