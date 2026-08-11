import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { searchLiveSyllabus } from "@/lib/syllabusSource";

function hashOf(c: { name: string; teacher: string | null; weekday: string | null; period: number | null }) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.weekday}|${c.period}`)
    .digest("hex");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";

  // 実際に大学のシラバス検索を叩くのは、意味のある検索語が入力されたときだけ
  // （空検索・1文字検索での全件取得は行わず、大学サーバーへの負荷を最小限にする）
  if (q.length >= 2 && (semester === "前期" || semester === "後期")) {
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
          where: { year, semester, code: row.code },
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
      year,
      semester,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return NextResponse.json({ courses });
}
