import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// 協賛枠の「詳しく見る」クリックを計測する。学生の操作を妨げないよう、
// 認証不要・失敗しても無視してよい軽量なカウンタとして扱う。
//
// clickCountは協賛企業への効果訴求に使う数値のため、スクリプトによる
// 連打で水増しできてしまわないよう、IPごとのレート制限をかける
// （実データレビューで、他ルートには既にある保護がここだけ抜けていたと判明）。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed } = checkRateLimit(`sponsor-click:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: true }); // 学生の操作性を優先し、エラーは見せずに黙って無視する
  }

  const { id } = await params;
  await prisma.sponsor
    .update({ where: { id }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
