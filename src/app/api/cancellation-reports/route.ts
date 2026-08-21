import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUser } from "@/lib/currentUser";
import { todayJstDate } from "@/lib/date";

// 「今日休講速報」：シラバス自動同期（学期に1回）とは別に、その日限りの
// 「今日この授業は休講かもしれない」という自己申告を集約するcrowd-sourced機能。
// 詳細はprisma/schema.prismaのCancellationReportモデルのコメントを参照。

// 複数件をまとめて問い合わせられるようにする（時間割ページで今日の全授業分を
// 1リクエストで取得するため）。
export async function GET(req: NextRequest) {
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const idsParam = req.nextUrl.searchParams.get("syllabusCourseIds");
  if (!idsParam) {
    return NextResponse.json({ error: "syllabusCourseIds is required" }, { status: 400 });
  }
  const syllabusCourseIds = idsParam.split(",").filter(Boolean).slice(0, 20);

  // 対象授業数は最大20件・報告は1ユーザー1日1回までのため件数自体が小さく、
  // 集計と「自分が報告済みか」を1回のfindManyから両方導出する方が
  // groupBy+findManyの2クエリより単純で分かりやすい。
  const date = todayJstDate();
  const reports = await prisma.cancellationReport.findMany({
    where: { syllabusCourseId: { in: syllabusCourseIds }, date },
    select: { syllabusCourseId: true, userId: true },
  });

  const counts: Record<string, number> = {};
  const reportedByMe: string[] = [];
  for (const r of reports) {
    counts[r.syllabusCourseId] = (counts[r.syllabusCourseId] ?? 0) + 1;
    if (r.userId === me.id) reportedByMe.push(r.syllabusCourseId);
  }

  return NextResponse.json({
    date,
    counts,
    reportedByMe,
  });
}

export async function POST(req: NextRequest) {
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`cancellation-report:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "報告が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const syllabusCourseId = body?.syllabusCourseId;
  if (typeof syllabusCourseId !== "string" || !syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  const course = await prisma.syllabusCourse.findUnique({ where: { id: syllabusCourseId } });
  if (!course) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // 授業カルテ（サイクル120）と同様、他大学の授業への操作を防ぐ。
  if (course.university !== me.university) {
    return NextResponse.json({ error: "所属大学の授業のみ報告できます。" }, { status: 403 });
  }

  const date = todayJstDate();

  // 同一ユーザーが同じ授業に何度も報告して水増ししてしまわないよう、
  // 1ユーザー1日1回までの制約をDBのunique制約で担保する
  // （サイクル104・111の教訓を最初から踏まえた設計）。
  const existing = await prisma.cancellationReport.findUnique({
    where: { syllabusCourseId_date_userId: { syllabusCourseId, date, userId: me.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "本日はこの授業について既に報告済みです" }, { status: 409 });
  }

  await prisma.cancellationReport.create({
    data: { syllabusCourseId, date, userId: me.id },
  });

  const count = await prisma.cancellationReport.count({
    where: { syllabusCourseId, date },
  });

  return NextResponse.json({ count });
}
