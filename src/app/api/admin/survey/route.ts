import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/adminAuth";

// 超軽量ヒアリング（1問アンケート）の集計結果を運営が確認するための管理用API。
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const responses = await prisma.appSurveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const avg =
    responses.length > 0
      ? Math.round((responses.reduce((sum, r) => sum + r.score, 0) / responses.length) * 10) / 10
      : null;

  return NextResponse.json({ count: responses.length, avg, responses });
}
