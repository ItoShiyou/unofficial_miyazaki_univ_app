import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { searchLiveSyllabus } from "@/lib/syllabusSource";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

function hashOf(c: { name: string; teacher: string | null; weekday: string | null; period: number | null }) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.weekday}|${c.period}`)
    .digest("hex");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";
  const university = req.nextUrl.searchParams.get("university") ?? "miyazaki-u";
  const weekday = req.nextUrl.searchParams.get("weekday")?.trim() || undefined;
  const periodRaw = req.nextUrl.searchParams.get("period");
  const period = periodRaw ? Number(periodRaw) : undefined;

  // その学期がすでに全件同期済み（マイページの「全件同期」）であれば、
  // 検索のたびに大学サイトへライブ問い合わせする必要はない。
  // 同期未実施の学期（キャッシュがほぼ空）の場合だけ、その場でライブ取得してフォールバックする。
  // ライブ検索（searchLiveSyllabus）は宮崎大学のみ対応しているため、他大学はキャッシュのみを参照する。
  const cachedCount = await prisma.syllabusCourse.count({ where: { university, year, semester } });
  const looksSynced = cachedCount >= 100;

  // ライブ取得は大学サイトへの外部リクエストを伴うため、連打・スクリプトによる
  // 大量アクセスで大学側に負荷をかけないよう、IPごとに頻度を制限する。
  // 制限にかかった場合はライブ取得だけをスキップし、以降の処理でキャッシュ済みデータを返す。
  const liveSearchAllowed = checkRateLimit(`syllabus-live-search:${clientIp(req)}`, 20, 60_000).allowed;

  if (university === "miyazaki-u" && !looksSynced && liveSearchAllowed && q.length >= 2 && (semester === "前期" || semester === "後期")) {
    try {
      const liveRows = await searchLiveSyllabus(year, semester, q);
      for (const row of liveRows) {
        const hash = hashOf({
          name: row.name,
          teacher: row.teacher,
          weekday: row.weekday,
          period: row.period,
        });
        const existing = await prisma.syllabusCourse.findFirst({
          where: { university, year, semester, code: row.code },
        });
        if (existing) {
          if (existing.rawHash !== hash) {
            await prisma.syllabusCourse.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                teacher: row.teacher,
                weekday: row.weekday,
                period: row.period,
                division: row.division,
                rawHash: hash,
                fetchedAt: new Date(),
              },
            });
          }
        } else {
          await prisma.syllabusCourse.create({
            data: {
              university,
              year,
              semester,
              code: row.code,
              name: row.name,
              teacher: row.teacher,
              weekday: row.weekday,
              period: row.period,
              division: row.division,
              rawHash: hash,
            },
          });
        }
      }
    } catch {
      // 大学側のサイトが落ちている・構造変更等で失敗しても、
      // これまでにキャッシュ済みのローカルデータで検索結果を返す
    }
  }

  const courses = await prisma.syllabusCourse.findMany({
    where: {
      university,
      year,
      semester,
      ...(q ? { name: { contains: q } } : {}),
      ...(weekday ? { weekday } : {}),
      ...(period ? { period } : {}),
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  // 一覧の評価表示に必要な集計を1クエリでまとめて取得し、
  // 一覧件数分の個別リクエスト（N+1）が発生しないようにする。
  const ratings = await prisma.courseKarte.groupBy({
    by: ["syllabusCourseId"],
    where: { syllabusCourseId: { in: courses.map((c) => c.id) } },
    _avg: {
      attendanceStrictness: true,
      assignmentVolume: true,
      examDifficulty: true,
      clarity: true,
      // overallEasiness（総合的な楽単度）はCourseKarteに以前から存在するが、
      // 一覧の集計・ソートに反映されておらず「収集したデータが使われていない」
      // 実装漏れだったため追加した（サイクル196）。
      overallEasiness: true,
    },
    _count: true,
  });
  const ratingByCourseId = new Map(ratings.map((r) => [r.syllabusCourseId, r]));

  const coursesWithRating = courses.map((c) => {
    const r = ratingByCourseId.get(c.id);
    if (!r) return { ...c, overall: null, easiness: null, karteCount: 0 };
    const avgs = [r._avg.attendanceStrictness, r._avg.assignmentVolume, r._avg.examDifficulty, r._avg.clarity].filter(
      (v): v is number => v !== null
    );
    const overall = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;
    const easiness =
      r._avg.overallEasiness !== null ? Math.round(r._avg.overallEasiness * 10) / 10 : null;
    return { ...c, overall, easiness, karteCount: r._count };
  });

  return NextResponse.json({ courses: coursesWithRating });
}
