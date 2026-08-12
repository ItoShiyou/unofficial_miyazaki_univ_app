import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

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
  // 匿名投稿の連投（スパム・荒らし）を抑止する
  const { allowed, retryAfterMs } = checkRateLimit(`karte-post:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "投稿が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

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

  const MAX_SHORT = 200;
  const MAX_LONG = 2000;
  const textFields: Array<[string, unknown, number]> = [
    ["attendanceMethod", attendanceMethod, MAX_SHORT],
    ["examFormat", examFormat, MAX_SHORT],
    ["atmosphere", atmosphere, MAX_SHORT],
    ["pace", pace, MAX_SHORT],
    ["advice", advice, MAX_LONG],
    ["comment", comment, MAX_LONG],
  ];
  for (const [field, value, max] of textFields) {
    if (typeof value === "string" && value.length > max) {
      return NextResponse.json({ error: `${field} が長すぎます（${max}文字まで）` }, { status: 400 });
    }
  }
  for (const [field, value] of [
    ["attendanceStrictness", attendanceStrictness],
    ["assignmentVolume", assignmentVolume],
    ["examDifficulty", examDifficulty],
    ["clarity", clarity],
  ] as const) {
    if (value !== undefined && value !== null && (typeof value !== "number" || value < 1 || value > 5)) {
      return NextResponse.json({ error: `${field} は1〜5の数値である必要があります` }, { status: 400 });
    }
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
