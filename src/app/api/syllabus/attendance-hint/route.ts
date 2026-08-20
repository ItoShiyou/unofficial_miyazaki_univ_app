import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAttendanceHint } from "@/lib/syllabusSource";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

/**
 * シラバス「履修上の注意」欄の出席・欠席関連の記述をヒントとして返す。
 * 一度取得した授業は結果をDBにキャッシュし、同じ授業について
 * 大学サイトへ何度も問い合わせないようにする。
 */
export async function GET(req: NextRequest) {
  const syllabusCourseId = req.nextUrl.searchParams.get("syllabusCourseId");
  if (!syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  const course = await prisma.syllabusCourse.findUnique({ where: { id: syllabusCourseId } });
  if (!course) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  if (course.attendanceHintFetchedAt) {
    return NextResponse.json({ hint: course.attendanceHint });
  }

  if (!course.code) {
    return NextResponse.json({ hint: null });
  }

  // 未キャッシュの授業IDを次々指定されると、そのたびに大学サイトへ外部リクエストが
  // 飛んでしまう（`syllabus/search`のライブ取得と同じ懸念）。同じ制限をここにもかける。
  const { allowed } = checkRateLimit(`attendance-hint-live:${clientIp(req)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ hint: null });
  }

  let hint: string | null = null;
  try {
    hint = await fetchAttendanceHint(course.year, course.code);
  } catch {
    // 詳細ページが取得できない場合はヒントなしとして扱う（キャッシュはしない）
    return NextResponse.json({ hint: null });
  }

  await prisma.syllabusCourse.update({
    where: { id: syllabusCourseId },
    data: { attendanceHint: hint, attendanceHintFetchedAt: new Date() },
  });

  return NextResponse.json({ hint });
}
