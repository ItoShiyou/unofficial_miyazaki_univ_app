import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

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

  const { deviceId, displayName } = await req.json();
  if (!deviceId || !displayName) {
    return NextResponse.json({ error: "deviceId and displayName are required" }, { status: 400 });
  }

  const code = genCode();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await prisma.inviteCode.create({
    data: { code, deviceId, displayName, expiresAt },
  });

  return NextResponse.json({ code, expiresAt });
}
