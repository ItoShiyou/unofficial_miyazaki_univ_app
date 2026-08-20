import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 地域協賛枠の一覧を返す。学生から課金しない代わりの収益源であり、
// 広告ではなく「宮崎県内の学生生活で使える店舗・企業」として提示する。
export async function GET() {
  const now = new Date();
  const sponsors = await prisma.sponsor.findMany({
    where: {
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // 将来、協賛企業へ「実際に何回表示されたか」を示せるようにするための表示回数計測。
  // レスポンスは待たせず、加算は裏で行う。
  if (sponsors.length > 0) {
    prisma.sponsor
      .updateMany({
        where: { id: { in: sponsors.map((s) => s.id) } },
        data: { impressionCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  return NextResponse.json({ sponsors });
}
