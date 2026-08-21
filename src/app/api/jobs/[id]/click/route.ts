import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 「応募ページへ進む」リンクのクリックを計測する（Sponsorのclickと同じ設計）。
// このクリックの先は必ず企業側の外部応募先URLであり、本アプリが応募を仲介することはない。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed } = checkRateLimit(`job-click:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await params;
  await prisma.jobPosting
    .update({ where: { id }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
