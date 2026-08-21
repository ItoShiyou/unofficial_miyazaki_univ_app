import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

// クーポンコードの開封（学生が「コードを見る」を押した）を計測する。
// 詳細リンクの単純なクリックより来店・購入意図が強い行動のため、
// 協賛企業への効果説明ではCTRよりもこちらの回数を主指標として使う想定。
//
// codeRevealCountも協賛企業への効果訴求に使う数値のため、連打による水増しを
// 防ぐレート制限をかける（clickCountと同じ理由。実データレビューで発見）。
//
// ログイン中であれば「地元スタンプ帳」用のスタンプも合わせて記録する。
// /sponsors自体は未ログインでも閲覧できる公開ページのため、未ログインの場合は
// クーポン開封自体は通常通り許可し、スタンプの記録だけをスキップする。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed } = checkRateLimit(`sponsor-reveal:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "しばらく時間をおいて再度お試しください" },
      { status: 429 }
    );
  }

  const { id } = await params;
  const sponsor = await prisma.sponsor
    .update({
      where: { id },
      data: { codeRevealCount: { increment: 1 } },
      select: { couponCode: true },
    })
    .catch(() => null);

  if (!sponsor || !sponsor.couponCode) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let stampCollected = false;
  const userId = await currentUserId(req);
  if (userId) {
    const existing = await prisma.sponsorStamp.findUnique({
      where: { userId_sponsorId: { userId, sponsorId: id } },
    });
    if (!existing) {
      await prisma.sponsorStamp.create({ data: { userId, sponsorId: id } }).catch(() => {});
      stampCollected = true;
    }
  }

  return NextResponse.json({ couponCode: sponsor.couponCode, stampCollected });
}
