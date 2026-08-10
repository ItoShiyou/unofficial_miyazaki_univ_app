import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { deviceId, displayName, data } = await req.json();
  if (!deviceId || !displayName || !Array.isArray(data)) {
    return NextResponse.json({ error: "deviceId, displayName, data are required" }, { status: 400 });
  }

  await prisma.sharedTimetable.upsert({
    where: { deviceId },
    update: { displayName, data: JSON.stringify(data) },
    create: { deviceId, displayName, data: JSON.stringify(data) },
  });

  return NextResponse.json({ ok: true });
}
