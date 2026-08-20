import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// 通報が入った授業カルテの一覧（非表示中・表示中どちらも含む）。
// 3件通報での自動非表示は「運営確認待ちの一時的な保留」であり、最終判断ではないため、
// 管理者がここで通報理由・本文を見て、復元(unhide)か削除かを判断する運用を前提にする。
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kartes = await prisma.courseKarte.findMany({
    where: { reportCount: { gt: 0 } },
    orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
    include: { syllabusCourse: { select: { name: true, teacher: true } } },
  });

  return NextResponse.json({ kartes });
}
