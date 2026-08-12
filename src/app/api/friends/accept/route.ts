import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 招待コード（6桁英数字）の総当たりを防ぐため、IPごとに試行回数を制限する
  const { allowed, retryAfterMs } = checkRateLimit(`friends-accept:${clientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。時間をおいて再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const { deviceId, displayName, code } = await req.json();
  if (!deviceId || !displayName || !code) {
    return NextResponse.json({ error: "deviceId, displayName, code are required" }, { status: 400 });
  }

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "招待コードが無効か期限切れです" }, { status: 404 });
  }
  if (invite.deviceId === deviceId) {
    return NextResponse.json({ error: "自分自身は登録できません" }, { status: 400 });
  }

  await prisma.friend.upsert({
    where: { deviceId_friendDeviceId: { deviceId, friendDeviceId: invite.deviceId } },
    update: { friendName: invite.displayName },
    create: { deviceId, friendDeviceId: invite.deviceId, friendName: invite.displayName },
  });
  await prisma.friend.upsert({
    where: { deviceId_friendDeviceId: { deviceId: invite.deviceId, friendDeviceId: deviceId } },
    update: { friendName: displayName },
    create: { deviceId: invite.deviceId, friendDeviceId: deviceId, friendName: displayName },
  });

  await prisma.inviteCode.delete({ where: { code } });

  return NextResponse.json({ friendName: invite.displayName, friendDeviceId: invite.deviceId });
}
