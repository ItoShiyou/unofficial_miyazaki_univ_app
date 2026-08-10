import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const syllabusCourseId = req.nextUrl.searchParams.get("syllabusCourseId");
  if (!syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  const kartes = await prisma.courseKarte.findMany({
    where: { syllabusCourseId },
    orderBy: { createdAt: "desc" },
  });

  const course = await prisma.syllabusCourse.findUnique({
    where: { id: syllabusCourseId },
  });

  function avg(field: keyof (typeof kartes)[number]) {
    const vals = kartes
      .map((k) => k[field] as number | null)
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  const summary = {
    count: kartes.length,
    attendanceStrictness: avg("attendanceStrictness"),
    assignmentVolume: avg("assignmentVolume"),
    examDifficulty: avg("examDifficulty"),
    clarity: avg("clarity"),
  };

  const overall =
    [summary.attendanceStrictness, summary.assignmentVolume, summary.examDifficulty, summary.clarity]
      .filter((v): v is number => v !== null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

  return NextResponse.json({ course, kartes, summary, overall: overall ? Math.round(overall * 10) / 10 : null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    syllabusCourseId,
    year,
    semester,
    attendanceMethod,
    attendanceStrictness,
    assignmentVolume,
    examFormat,
    examDifficulty,
    clarity,
    atmosphere,
    pace,
    advice,
    comment,
  } = body;

  if (!syllabusCourseId || !year || !semester) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const karte = await prisma.courseKarte.create({
    data: {
      syllabusCourseId,
      year,
      semester,
      attendanceMethod,
      attendanceStrictness,
      assignmentVolume,
      examFormat,
      examDifficulty,
      clarity,
      atmosphere,
      pace,
      advice,
      comment,
    },
  });

  return NextResponse.json({ karte });
}
