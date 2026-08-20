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
  return NextResponse.json({ sponsors });
}
