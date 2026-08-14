import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 同期状況の閲覧のみ（読み取り専用）。同期の実行はサーバー側cronのみが行う。
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";
  const university = req.nextUrl.searchParams.get("university") ?? "miyazaki-u";

  const total = await prisma.syllabusCourse.count({ where: { university, year, semester } });
  const latest = await prisma.syllabusCourse.findFirst({
    where: { university, year, semester },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return NextResponse.json({ total, lastFetchedAt: latest?.fetchedAt ?? null });
}
