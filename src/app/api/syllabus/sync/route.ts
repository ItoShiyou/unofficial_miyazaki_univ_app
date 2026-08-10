import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * 学外公開シラバスから最新情報を取得し、既存レコードと比較して
 * 差分（担当教員・教室の変更等）を検知する。
 *
 * 現状、宮崎大学の公開シラバスの実際の取得元URL・フォーマットは未調査のため、
 * fetchLatestSyllabus() はプレースホルダーの fetcher インターフェースとして実装している。
 * 実運用時はここを大学公式シラバスサイトのスクレイピング/APIに差し替える。
 * (利用規約・robots.txt の確認は別タスク)
 */
async function fetchLatestSyllabus(
  year: number,
  semester: string
): Promise<Array<{ name: string; teacher: string | null; room: string | null; weekday: string | null; period: number | null }>> {
  // プレースホルダー: 現在DBにある内容をそのまま返す（実装差し替え待ち）
  const existing = await prisma.syllabusCourse.findMany({ where: { year, semester } });
  return existing.map((c) => ({
    name: c.name,
    teacher: c.teacher,
    room: c.room,
    weekday: c.weekday,
    period: c.period,
  }));
}

function hashOf(c: { name: string; teacher: string | null; room: string | null }) {
  return createHash("sha256").update(`${c.name}|${c.teacher}|${c.room}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const { year, semester } = await req.json();
  if (!year || !semester) {
    return NextResponse.json({ error: "year and semester are required" }, { status: 400 });
  }

  const latest = await fetchLatestSyllabus(year, semester);
  const changes: Array<{ courseName: string; field: string; oldValue: string | null; newValue: string | null }> = [];

  for (const c of latest) {
    const existing = await prisma.syllabusCourse.findFirst({
      where: { year, semester, name: c.name },
    });
    const newHash = hashOf(c);

    if (!existing) {
      await prisma.syllabusCourse.create({
        data: { year, semester, ...c, rawHash: newHash },
      });
      continue;
    }

    if (existing.rawHash !== newHash) {
      if (existing.teacher !== c.teacher) {
        changes.push({ courseName: c.name, field: "teacher", oldValue: existing.teacher, newValue: c.teacher });
      }
      if (existing.room !== c.room) {
        changes.push({ courseName: c.name, field: "room", oldValue: existing.room, newValue: c.room });
      }
      await prisma.syllabusCourse.update({
        where: { id: existing.id },
        data: { ...c, rawHash: newHash, fetchedAt: new Date() },
      });
    }
  }

  if (changes.length > 0) {
    await prisma.syllabusChange.createMany({
      data: changes.map((c) => ({ ...c, year, semester })),
    });
  }

  return NextResponse.json({ checked: latest.length, changes });
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
