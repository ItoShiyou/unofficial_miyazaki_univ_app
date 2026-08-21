import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// イベント終了後アンケート（満足度1〜5・任意コメント）。
// 来場（checkedIn）済みのRSVPに対してのみ回答できる。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`event-feedback:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const rating = typeof body?.rating === "number" ? Math.trunc(body.rating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "ratingは1〜5の整数で指定してください。" }, { status: 400 });
  }
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) || null : null;

  const existing = await prisma.eventRsvp.findUnique({
    where: { userId_sponsorId: { userId, sponsorId: id } },
  });
  if (!existing || !existing.checkedIn) {
    return NextResponse.json(
      { error: "来場記録のあるイベントのみアンケートに回答できます。" },
      { status: 404 }
    );
  }

  await prisma.eventRsvp.update({
    where: { userId_sponsorId: { userId, sponsorId: id } },
    data: { feedbackRating: rating, feedbackComment: comment, feedbackAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
