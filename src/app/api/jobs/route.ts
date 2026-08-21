import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 求人・インターン・説明会の掲示板（公開）。募集情報等提供としての位置づけを
// 保つため、企業が掲載した情報を返すのみで、学生側のデータは一切含まない・送らない。
export async function GET(req: NextRequest) {
  const now = new Date();
  const jobs = await prisma.jobPosting.findMany({
    where: {
      isActive: true,
      OR: [{ deadline: null }, { deadline: { gte: now } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // Sponsorモデルと同じ理由（実データレビュー済み、docs/autonomous_improvement_log.md サイクル11・38参照）で、
  // 表示回数の水増しを防ぐため加算のみレート制限する（一覧取得自体は制限しない）。
  const { allowed } = checkRateLimit(`job-impression:${clientIp(req)}`, 10, 60_000);
  if (allowed && jobs.length > 0) {
    prisma.jobPosting
      .updateMany({
        where: { id: { in: jobs.map((j) => j.id) } },
        data: { impressionCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  return NextResponse.json({ jobs });
}
