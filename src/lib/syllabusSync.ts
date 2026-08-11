import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchFullSyllabusCatalog } from "@/lib/syllabusSource";
import type { SemesterName } from "@/lib/semester";

/**
 * 指定した学期の授業を大学の公開シラバスから全件取得し、サーバー側DBに丸ごと保管する。
 * 誰がどの授業を検索・登録したかに関わらず、その学期の全学部・全学科分をキャッシュする。
 *
 * サーバー側（cronジョブ）からのみ呼び出す想定。クライアントから直接この処理を
 * 起動する経路は存在しない（学期ごとに年2回、サーバー側の判断でのみ実行する）。
 */
function hashOf(c: { name: string; teacher: string | null; weekday: string | null; period: number | null }) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.weekday}|${c.period}`)
    .digest("hex");
}

export interface SyllabusSyncResult {
  year: number;
  semester: SemesterName;
  checked: number;
  created: number;
  updated: number;
  removed: number;
  changes: Array<{
    syllabusCourseId: string | null;
    courseName: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
}

export async function runFullSemesterSync(
  year: number,
  semester: SemesterName
): Promise<SyllabusSyncResult> {
  const existingRows = await prisma.syllabusCourse.findMany({
    where: { year, semester },
  });
  const existingByCode = new Map(existingRows.map((c) => [c.code, c]));

  const liveRows = await fetchFullSyllabusCatalog(year, semester);

  const changes: SyllabusSyncResult["changes"] = [];
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
        changes.push({
          syllabusCourseId: existing.id,
          courseName: row.name,
          field: "teacher",
          oldValue: existing.teacher,
          newValue: row.teacher,
        });
      }
      if (existing.weekday !== row.weekday || existing.period !== row.period) {
        changes.push({
          syllabusCourseId: existing.id,
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
    changes.push({
      syllabusCourseId: r.id,
      courseName: r.name,
      field: "removed",
      oldValue: "掲載あり",
      newValue: "掲載なし",
    });
  }

  if (changes.length > 0) {
    await prisma.syllabusChange.createMany({
      data: changes.map((c) => ({ ...c, year, semester })),
    });
  }

  return {
    year,
    semester,
    checked: liveRows.length,
    created,
    updated,
    removed: removed.length,
    changes,
  };
}
