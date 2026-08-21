import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";

// イベント当日の「来場しました」自己申告チェックイン。ビジコンの検証計画
// （Gate B）が測定項目に挙げる「来場」をアプリ上で記録する。申込済みであることを
// 前提にする（申込していないのに来場だけ記録できてしまうと、Gate Bで見たい
// 「申込→来場の転換率」という指標自体が意味をなさなくなるため）。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const rsvp = await prisma.eventRsvp
    .update({
      where: { userId_sponsorId: { userId, sponsorId: id } },
      data: { checkedIn: true, checkedInAt: new Date() },
    })
    .catch(() => null);

  if (!rsvp) {
    return NextResponse.json({ error: "先にイベントへの参加申込をしてください" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
