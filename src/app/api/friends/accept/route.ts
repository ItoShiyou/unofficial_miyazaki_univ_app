import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUser } from "@/lib/currentUser";

export async function POST(req: NextRequest) {
  // 招待コード（6桁英数字）の総当たりを防ぐため、IPごとに試行回数を制限する
  const { allowed, retryAfterMs } = checkRateLimit(`friends-accept:${clientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。時間をおいて再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const userId = me.id;

  const body = await req.json().catch(() => null);
  const displayName = body?.displayName;
  const code = body?.code;
  if (typeof displayName !== "string" || !displayName || typeof code !== "string" || !code) {
    return NextResponse.json({ error: "ニックネームと招待コードが必要です" }, { status: 400 });
  }

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "招待コードが無効か期限切れです" }, { status: 404 });
  }
  if (invite.userId === userId) {
    return NextResponse.json({ error: "自分自身は登録できません" }, { status: 400 });
  }

  // 実データレビューで、友達機能はdocs/pivot_story.mdにて「宮崎大学に閉じた小さな
  // コミュニティ内での付随機能」と意図的に位置づけられている（時間割共有の中核領域で
  // 直接競合する「すごい時間割」との差別化上、大学単位でのスコープ限定が前提）にも
  // 関わらず、大学が一致するかのチェックが実装から漏れていたと判明したため追加した。
  const inviter = await prisma.user.findUnique({ where: { id: invite.userId } });
  if (!inviter || inviter.university !== me.university) {
    return NextResponse.json(
      { error: "友達機能は同じ大学の学生同士でのみご利用いただけます。" },
      { status: 403 }
    );
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
