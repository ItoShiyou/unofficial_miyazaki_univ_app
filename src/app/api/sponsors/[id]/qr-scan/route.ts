import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// QRコード経由の流入計測。チラシ・ポスターのQRは /sponsors?qr=<sponsorId> を指し、
// フロント側がページ読み込み時に一度だけこのエンドポイントを叩く。
// 同一IPからの連打で水増しできないよう、通常のimpression計測と同様にレート制限する。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed } = checkRateLimit(`sponsor-qr:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await params;
  await prisma.sponsor
    .update({ where: { id }, data: { qrScanCount: { increment: 1 } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
