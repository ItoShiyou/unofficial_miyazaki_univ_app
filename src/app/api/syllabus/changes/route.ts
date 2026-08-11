import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const syllabusCourseId = req.nextUrl.searchParams.get("syllabusCourseId");
  const year = Number(req.nextUrl.searchParams.get("year")) || undefined;
  const semester = req.nextUrl.searchParams.get("semester") ?? undefined;

  if (!syllabusCourseId && !(year && semester)) {
    return NextResponse.json(
      { error: "syllabusCourseId または year+semester のいずれかが必要です" },
      { status: 400 }
    );
  }

  const changes = await prisma.syllabusChange.findMany({
    where: syllabusCourseId ? { syllabusCourseId } : { year, semester },
    orderBy: { detectedAt: "desc" },
    take: syllabusCourseId ? 20 : 50,
  });

  return NextResponse.json({ changes });
}
