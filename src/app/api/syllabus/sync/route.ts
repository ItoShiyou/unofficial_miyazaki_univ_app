import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { searchLiveSyllabus } from "@/lib/syllabusSource";

/**
 * これまでにキャッシュ済み（＝実際に誰かが検索・登録した）授業だけを対象に、
 * 大学の公開シラバスを再取得して差分（担当教員・曜日時限の変更等）を検知する。
 *
 * 全学の授業を総なめにするクロールは行わない。ユーザーが実際に触れた
 * 授業だけを対象にすることで、大学サーバーへのアクセス量を必要最小限に抑える。
 */
function hashOf(c: { name: string; teacher: string | null; weekday: string | null; period: number | null }) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.weekday}|${c.period}`)
    .digest("hex");
}

const MAX_COURSES_PER_SYNC = 50;

export async function POST(req: NextRequest) {
  const { year, semester } = await req.json();
  if (!year || !semester) {
    return NextResponse.json({ error: "year and semester are required" }, { status: 400 });
  }
  if (semester !== "前期" && semester !== "後期") {
    return NextResponse.json({ error: "semester must be 前期 or 後期" }, { status: 400 });
  }

  const cached = await prisma.syllabusCourse.findMany({
    where: { year, semester },
    take: MAX_COURSES_PER_SYNC,
  });

  const changes: Array<{ courseName: string; field: string; oldValue: string | null; newValue: string | null }> = [];
  let checked = 0;

  // 授業名ごとに再検索（同名科目はまとめて1回のリクエストで済ませる）
  const uniqueNames = Array.from(new Set(cached.map((c) => c.name)));

  for (const name of uniqueNames) {
    let liveRows;
    try {
      liveRows = await searchLiveSyllabus(year, semester, name);
    } catch {
      continue; // 大学側が一時的に取得できない場合はスキップし、次の授業へ
    }
    checked += liveRows.length;

    for (const local of cached.filter((c) => c.name === name)) {
      const match = liveRows.find((r) => r.code === local.code) ?? liveRows.find((r) => r.name === local.name);
      if (!match) continue;

      const newHash = hashOf({
        name: match.name,
        teacher: match.teacher,
        weekday: match.weekday,
        period: match.period,
      });

      if (local.rawHash !== newHash) {
        if (local.teacher !== match.teacher) {
          changes.push({ courseName: local.name, field: "teacher", oldValue: local.teacher, newValue: match.teacher });
        }
        if (local.weekday !== match.weekday || local.period !== match.period) {
          changes.push({
            courseName: local.name,
            field: "schedule",
            oldValue: `${local.weekday ?? ""}${local.period ?? ""}`,
            newValue: `${match.weekday ?? ""}${match.period ?? ""}`,
          });
        }
        await prisma.syllabusCourse.update({
          where: { id: local.id },
          data: {
            teacher: match.teacher,
            weekday: match.weekday,
            period: match.period,
            division: match.division,
            rawHash: newHash,
            fetchedAt: new Date(),
          },
        });
      }
    }
  }

  if (changes.length > 0) {
    await prisma.syllabusChange.createMany({
      data: changes.map((c) => ({ ...c, year, semester })),
    });
  }

  return NextResponse.json({ checked, changes });
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";

  const changes = await prisma.syllabusChange.findMany({
    where: { year, semester },
    orderBy: { detectedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ changes });
}
