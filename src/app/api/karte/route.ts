import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUser } from "@/lib/currentUser";
import { containsPersonalAttack } from "@/lib/karteValidation";

// 実データレビューで、少人数授業（ゼミ・専門演習等）では自由記述（advice/comment）の
// 文体・具体的なエピソードから投稿者本人や少人数グループが実質的に特定されてしまう
// 「k-匿名性の欠如」リスクが指摘された。ログイン必須（アカウント作成にドメイン制限が
// 無いため実質的な壁としては弱い、サイクル89参照）だけでは対策として不十分なため、
// 件数が閾値未満の授業は自由記述を非表示にし、星評価等の集計数値のみ返す。
const FREE_TEXT_MIN_COUNT = 5;

export async function GET(req: NextRequest) {
  const syllabusCourseId = req.nextUrl.searchParams.get("syllabusCourseId");
  if (!syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  // 実データレビューで、GETにはPOSTと違って大学スコープの確認が無く、
  // 他大学のsyllabusCourseIdを（検索APIで正規に）入手すれば、他大学の
  // 授業カルテ（自由記述含む）をAPI直叩きで閲覧できてしまうと判明した。
  // 「同じ大学の学生にだけ読まれる」前提で書かれた自由記述が、他大学の
  // 第三者に見えてしまう実害があるため、POSTと同様にログイン必須にし、
  // 自分の所属大学の授業かどうかを確認する。
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const course = await prisma.syllabusCourse.findUnique({
    where: { id: syllabusCourseId },
  });
  if (course && course.university !== me.university) {
    return NextResponse.json(
      { error: "所属大学の授業のみ閲覧できます。" },
      { status: 403 }
    );
  }

  const rawKartes = await prisma.courseKarte.findMany({
    where: { syllabusCourseId, hidden: false },
    orderBy: { createdAt: "desc" },
  });

  const freeTextHidden = rawKartes.length > 0 && rawKartes.length < FREE_TEXT_MIN_COUNT;
  const kartes = freeTextHidden
    ? rawKartes.map((k) => ({ ...k, advice: null, comment: null }))
    : rawKartes;

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
    overallEasiness: avg("overallEasiness"),
  };

  const overall =
    [summary.attendanceStrictness, summary.assignmentVolume, summary.examDifficulty, summary.clarity]
      .filter((v): v is number => v !== null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

  return NextResponse.json({
    course,
    kartes,
    summary,
    overall: overall ? Math.round(overall * 10) / 10 : null,
    freeTextHidden,
  });
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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
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
    overallEasiness,
    atmosphere,
    pace,
    advice,
    comment,
  } = body;

  if (!syllabusCourseId || !year || !semester) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const targetCourse = await prisma.syllabusCourse.findUnique({
    where: { id: syllabusCourseId },
    select: { university: true },
  });
  if (!targetCourse) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  // 自分の大学の授業にだけ投稿できるようにする。
  // 検索APIは所属大学でスコープされているため通常のUI操作では起きないが、
  // 「その大学の学生が書いた一次情報」という前提を崩さないためサーバー側でも確認する。
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (me.university !== targetCourse.university) {
    return NextResponse.json(
      { error: "所属大学の授業にのみ投稿できます。" },
      { status: 403 }
    );
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
    ["advice", advice],
    ["comment", comment],
  ] as const) {
    if (typeof value === "string" && containsPersonalAttack(value)) {
      return NextResponse.json(
        { error: `${field} に教員個人への人格攻撃・外見への言及と受け取れる語句が含まれています。授業の内容についての記述に見直してください` },
        { status: 400 }
      );
    }
  }
  for (const [field, value] of [
    ["attendanceStrictness", attendanceStrictness],
    ["assignmentVolume", assignmentVolume],
    ["examDifficulty", examDifficulty],
    ["clarity", clarity],
    ["overallEasiness", overallEasiness],
  ] as const) {
    if (value !== undefined && value !== null && (typeof value !== "number" || value < 1 || value > 5)) {
      return NextResponse.json({ error: `${field} は1〜5の数値である必要があります` }, { status: 400 });
    }
  }

  const karte = await prisma.courseKarte.create({
    data: {
      syllabusCourseId,
      university: targetCourse.university,
      year,
      semester,
      attendanceMethod,
      attendanceStrictness,
      assignmentVolume,
      examFormat,
      examDifficulty,
      clarity,
      overallEasiness,
      atmosphere,
      pace,
      advice,
      comment,
    },
  });

  return NextResponse.json({ karte });
}
