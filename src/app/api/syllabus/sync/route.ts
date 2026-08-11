import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchFullSyllabusCatalog } from "@/lib/syllabusSource";

/**
 * 指定した学期の授業を大学の公開シラバスから全件取得し、サーバー側DBに丸ごと保管する。
 * 誰がどの授業を検索・登録したかに関わらず、その学期の全学部・全学科分をキャッシュする。
 *
 * 全件取得は1学期あたり数百〜千件規模のリクエストになるため、明示的な「同期」操作
 * （マイページのボタン）からのみ呼び出す。学期の変わり目（年2回程度）を想定した頻度。
 */
function hashOf(c: { name: string; teacher: string | null; weekday: string | null; period: number | null }) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.weekday}|${c.period}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const { year, semester } = await req.json();
  if (!year || !semester) {
    return NextResponse.json({ error: "year and semester are required" }, { status: 400 });
  }
  if (semester !== "前期" && semester !== "後期") {
    return NextResponse.json({ error: "semester must be 前期 or 後期" }, { status: 400 });
  }

  const existingRows = await prisma.syllabusCourse.findMany({
    where: { year, semester },
  });
  const existingByCode = new Map(existingRows.map((c) => [c.code, c]));

  let liveRows;
  try {
    liveRows = await fetchFullSyllabusCatalog(year, semester);
  } catch (e) {
    return NextResponse.json(
      { error: `シラバスの取得に失敗しました: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }

  const changes: Array<{ courseName: string; field: string; oldValue: string | null; newValue: string | null }> = [];
  let created = 0;
  let updated = 0;
  const seenCodes = new Set<string>();

  for (const row of liveRows) {
    seenCodes.add(row.code);
    const newHash = hashOf({
      name: row.name,
      teacher: row.teacher,
      weekday: row.weekday,
      period: row.period,
    });
    const existing = existingByCode.get(row.code);

    if (!existing) {
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
          rawHash: newHash,
        },
      });
      created++;
      continue;
    }

    if (existing.rawHash !== newHash) {
      if (existing.teacher !== row.teacher) {
        changes.push({ courseName: row.name, field: "teacher", oldValue: existing.teacher, newValue: row.teacher });
      }
      if (existing.weekday !== row.weekday || existing.period !== row.period) {
        changes.push({
          courseName: row.name,
          field: "schedule",
          oldValue: `${existing.weekday ?? ""}${existing.period ?? ""}`,
          newValue: `${row.weekday ?? ""}${row.period ?? ""}`,
        });
      }
      await prisma.syllabusCourse.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          teacher: row.teacher,
          weekday: row.weekday,
          period: row.period,
          division: row.division,
          rawHash: newHash,
          fetchedAt: new Date(),
        },
      });
      updated++;
    }
  }

  // 今回の取得結果に含まれなくなった授業（閉講・コード変更等）を検知
  const removed = existingRows.filter((c) => c.code && !seenCodes.has(c.code));
  for (const r of removed) {
    changes.push({ courseName: r.name, field: "removed", oldValue: "掲載あり", newValue: "掲載なし" });
  }

  if (changes.length > 0) {
    await prisma.syllabusChange.createMany({
      data: changes.map((c) => ({ ...c, year, semester })),
    });
  }

  return NextResponse.json({
    checked: liveRows.length,
    created,
    updated,
    removed: removed.length,
    changes,
  });
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const semester = req.nextUrl.searchParams.get("semester") ?? "後期";

  const changes = await prisma.syllabusChange.findMany({
    where: { year, semester },
    orderBy: { detectedAt: "desc" },
    take: 50,
  });
  const total = await prisma.syllabusCourse.count({ where: { year, semester } });

  return NextResponse.json({ changes, total });
}
