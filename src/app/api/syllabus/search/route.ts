import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";

  const courses = await prisma.syllabusCourse.findMany({
    where: {
      year,
      semester,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return NextResponse.json({ courses });
}
