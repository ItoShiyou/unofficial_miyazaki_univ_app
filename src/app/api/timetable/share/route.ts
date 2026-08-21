import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`timetable-share:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const displayName = body?.displayName;
  const data = body?.data;
  if (typeof displayName !== "string" || !displayName || !Array.isArray(data)) {
    return NextResponse.json({ error: "displayName, data are required" }, { status: 400 });
  }

  // 友達に見せるのは「曜日・時限・授業名」だけに限定する。
  // クライアントから余分なフィールドが送られてきても保存しない。
  const timetable = data
    .filter((c) => c && typeof c.name === "string")
    .slice(0, 100)
    .map((c) => ({
      weekday: String(c.weekday ?? ""),
      period: Number(c.period) || 0,
      name: String(c.name).slice(0, 100),
    }));

  const name = String(displayName).trim().slice(0, 50);

  await prisma.sharedTimetable.upsert({
    where: { userId },
    update: { displayName: name, data: JSON.stringify(timetable) },
    create: { userId, displayName: name, data: JSON.stringify(timetable) },
  });

  return NextResponse.json({ ok: true });
}
