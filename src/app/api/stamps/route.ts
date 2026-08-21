import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";

// ログイン中の利用者が集めた地元スタンプの一覧。
export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const stamps = await prisma.sponsorStamp.findMany({
    where: { userId },
    orderBy: { collectedAt: "desc" },
    include: { sponsor: { select: { id: true, name: true, category: true, area: true, isActive: true } } },
  });

  return NextResponse.json({ stamps });
}
