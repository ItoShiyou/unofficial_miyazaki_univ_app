import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// 匿名投稿である授業カルテは、特定の教員・授業への誹謗中傷に使われるリスクがある。
// 一定数の通報が集まった投稿は運営の確認を待たず自動的に非表示にし、被害の拡大を抑える。
// 通報の乱用（特定投稿を狙い撃ちで消す嫌がらせ）を防ぐため、IPごとの通報回数もレート制限する。
const HIDE_THRESHOLD = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, retryAfterMs } = checkRateLimit(`karte-report:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "通報が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const { id } = await params;
  const karte = await prisma.courseKarte
    .update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    })
    .catch(() => null);
  if (!karte) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (karte.reportCount >= HIDE_THRESHOLD && !karte.hidden) {
    await prisma.courseKarte.update({ where: { id }, data: { hidden: true } });
  }

  return NextResponse.json({ ok: true });
}
