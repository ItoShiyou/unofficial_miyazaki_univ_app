import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// イベントへの参加申込・取消。ビジコンの検証計画（Gate B）が測定項目に挙げる
// 「申込」をアプリ上で記録する。ログイン必須（同一学生の重複申込を防ぐため）。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`event-rsvp:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください" }, { status: 429 });
  }

  const { id } = await params;
  const sponsor = await prisma.sponsor.findUnique({ where: { id }, select: { eventLabel: true } });
  if (!sponsor || !sponsor.eventLabel) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }

  await prisma.eventRsvp
    .upsert({
      where: { userId_sponsorId: { userId, sponsorId: id } },
      update: {},
      create: { userId, sponsorId: id },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.eventRsvp.deleteMany({ where: { userId, sponsorId: id } });
  return NextResponse.json({ ok: true });
}
