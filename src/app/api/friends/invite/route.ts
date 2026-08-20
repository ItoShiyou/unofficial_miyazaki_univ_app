import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(`friends-invite:${clientIp(req)}`, 10, 60_000);
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

  const body = await req.json().catch(() => null);
  const displayName = body?.displayName;
  if (!displayName || typeof displayName !== "string") {
    return NextResponse.json({ error: "ニックネームを設定してください" }, { status: 400 });
  }

  const code = genCode();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await prisma.inviteCode.create({
    data: { code, userId, displayName: displayName.trim().slice(0, 50), expiresAt },
  });

  return NextResponse.json({ code, expiresAt });
}
