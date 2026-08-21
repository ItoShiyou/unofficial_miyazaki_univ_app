import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchFullSyllabusCatalog, type RawSyllabusRow } from "@/lib/syllabusSource";
import { fetchFullSyllabusCatalogMmu } from "@/lib/syllabusSourceMmu";
import { fetchFullSyllabusCatalogMiu } from "@/lib/syllabusSourceMiu";
import { fetchFullSyllabusCatalogMpu } from "@/lib/syllabusSourceMpu";
import { fetchFullSyllabusCatalogNankyudai } from "@/lib/syllabusSourceNankyudai";
import { fetchFullSyllabusCatalogKyushuIryo } from "@/lib/syllabusSourceKyushuIryo";
import { universitySupportsSyllabusSync } from "@/lib/universities";
import { sendPushToUsers } from "@/lib/webPush";
import type { SemesterName } from "@/lib/semester";

// 大学ごとの一覧取得関数のレジストリ。新しい大学を追加する場合は
// ここに1エントリ追加し、対応するsyllabusSourceXxx.tsを実装した上で、
// @/lib/universities の syllabusSyncSupported も true にする。
const CATALOG_FETCHERS: Record<
  string,
  (year: number, semester: SemesterName) => Promise<RawSyllabusRow[]>
> = {
  "miyazaki-u": fetchFullSyllabusCatalog,
  "miyazaki-municipal-u": fetchFullSyllabusCatalogMmu,
  "miyazaki-international-u": fetchFullSyllabusCatalogMiu,
  "miyazaki-nursing-u": fetchFullSyllabusCatalogMpu,
  "minami-kyushu-u": fetchFullSyllabusCatalogNankyudai,
  "kyushu-uhs": fetchFullSyllabusCatalogKyushuIryo,
};

export function supportsSyllabusSync(university: string): boolean {
  return universitySupportsSyllabusSync(university);
}

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
  university: string;
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
  university: string,
  year: number,
  semester: SemesterName
): Promise<SyllabusSyncResult> {
  const fetchCatalog = CATALOG_FETCHERS[university];
  if (!fetchCatalog) {
    throw new Error(`unsupported university for syllabus sync: ${university}`);
  }

  const existingRows = await prisma.syllabusCourse.findMany({
    where: { university, year, semester },
  });
  const existingByCode = new Map(existingRows.map((c) => [c.code, c]));

  const liveRows = await fetchCatalog(year, semester);

  // 実データレビューで、大学サイトの構造変更等でパースが壊れても例外にならず、
  // 取得件数が極端に少ない配列がそのまま返ってくる「静かな全欠落」のケースが
  // あり得ると判明した。この場合、既存の授業が軒並み「掲載なし（removed）」と
  // 誤検知され、SyllabusChangeに大量の削除レコードが記録されてしまう。
  // 前回取得分の20%を下回るほど急減した場合は明らかに異常な取得結果とみなし、
  // 既存データへの影響が出る前に処理を打ち切る。
  if (existingRows.length > 0 && liveRows.length < existingRows.length * 0.2) {
    throw new Error(
      `取得件数が異常に少ないため中断しました（前回${existingRows.length}件 → 今回${liveRows.length}件）。大学サイトの構造変更等が疑われます`
    );
  }

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
          university,
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
      data: changes.map((c) => ({ ...c, university, year, semester })),
    });
    // 時間割データそのものはサーバーに送らない設計のため、「誰が履修しているか」は
    // 分からない。代わりに、利用者自身が明示的に「通知してほしい」と登録した
    // WatchedCourseだけを頼りに、変更があった授業を見ている人にだけプッシュする。
    await notifyWatchers(changes).catch(() => {});
  }

  return {
    university,
    year,
    semester,
    checked: liveRows.length,
    created,
    updated,
    removed: removed.length,
    changes,
  };
}

const FIELD_LABEL: Record<string, string> = {
  teacher: "担当教員",
  schedule: "曜日・時限",
  removed: "掲載状況",
};

async function notifyWatchers(changes: SyllabusSyncResult["changes"]): Promise<void> {
  const courseIds = [...new Set(changes.map((c) => c.syllabusCourseId).filter((id): id is string => !!id))];
  if (courseIds.length === 0) return;

  const watchers = await prisma.watchedCourse.findMany({
    where: { syllabusCourseId: { in: courseIds } },
  });
  if (watchers.length === 0) return;

  const watchersByCourseId = new Map<string, string[]>();
  for (const w of watchers) {
    watchersByCourseId.set(w.syllabusCourseId, [...(watchersByCourseId.get(w.syllabusCourseId) ?? []), w.userId]);
  }

  // 同じ授業で複数件の変更が起きても、通知は1件にまとめる（連続でうるさくしない）
  const changesByCourseId = new Map<string, typeof changes>();
  for (const c of changes) {
    if (!c.syllabusCourseId) continue;
    changesByCourseId.set(c.syllabusCourseId, [...(changesByCourseId.get(c.syllabusCourseId) ?? []), c]);
  }

  await Promise.all(
    [...changesByCourseId.entries()].map(async ([courseId, courseChanges]) => {
      const userIds = watchersByCourseId.get(courseId);
      if (!userIds || userIds.length === 0) return;
      const summary = courseChanges
        .map((c) => FIELD_LABEL[c.field] ?? c.field)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join("・");
      await sendPushToUsers(userIds, {
        title: `${courseChanges[0].courseName}のシラバスが変更されました`,
        body: `${summary}が更新されました。アプリで詳しく確認してください。`,
        url: `/karte/${courseId}`,
      });
    })
  );
}
