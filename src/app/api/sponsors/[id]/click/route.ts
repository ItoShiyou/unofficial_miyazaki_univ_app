import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 協賛枠の「詳しく見る」クリックを計測する。学生の操作を妨げないよう、
// 認証不要・失敗しても無視してよい軽量なカウンタとして扱う。
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.sponsor
    .update({ where: { id }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
