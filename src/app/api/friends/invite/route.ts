import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
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
