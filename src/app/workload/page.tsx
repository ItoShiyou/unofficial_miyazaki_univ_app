"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, WEEKDAYS } from "@/lib/db";
import { useCurrentSemester } from "@/lib/useSemester";
import { semesterLabel } from "@/lib/semester";
import { periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";
import { PageHeader, Card, ProgressBar, StarRating } from "@/components/ui";

interface KarteSummary {
  count: number;
  attendanceStrictness: number | null;
  assignmentVolume: number | null;
  examDifficulty: number | null;
  clarity: number | null;
}

const METRICS = [
  { key: "attendanceStrictness", label: "出席の厳しさ" },
  { key: "assignmentVolume", label: "課題の多さ" },
  { key: "examDifficulty", label: "試験の難易度" },
] as const;

const WEEKDAYS6 = WEEKDAYS.slice(0, 6);

export default function WorkloadPage() {
  const semester = useCurrentSemester();
  const account = useAccount();
  const courses =
    useLiveQuery(
      () =>
        db.courses.where("[year+semester]").equals([semester.year, semester.semester]).toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  const [summaryState, setSummaryState] = useState<{
    key: string;
    summaries: Record<string, KarteSummary | null>;
  }>({ key: "", summaries: {} });

  const linkedIds = courses
    .filter((c) => c.syllabusCourseId)
    .map((c) => c.id)
    .sort()
    .join(",");
  const requestKey = `${semester.year}-${semester.semester}-${linkedIds}`;
  const loaded = summaryState.key === requestKey;
  const summaries = loaded ? summaryState.summaries : {};

  useEffect(() => {
    const linked = courses.filter((c) => c.syllabusCourseId);
    let ignore = false;
    Promise.all(
      linked.map((c) =>
        fetch(`/api/karte?syllabusCourseId=${c.syllabusCourseId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => [c.id, d?.summary ?? null] as const)
          .catch(() => [c.id, null] as const)
      )
    ).then((entries) => {
      if (ignore) return;
      setSummaryState({ key: requestKey, summaries: Object.fromEntries(entries) });
    });
    return () => {
      ignore = true;
    };
    // courses（Dexieのライブクエリ結果）は参照が毎回変わるため、実質的なキーである
    // requestKey（学期＋連携授業IDの集合）だけを見て再取得する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const withData = courses.filter((c) => c.syllabusCourseId && summaries[c.id]?.count);
  const overall: Record<string, number | null> = {};
  for (const m of METRICS) {
    const vals = withData
      .map((c) => summaries[c.id]?.[m.key] ?? null)
      .filter((v): v is number => v !== null);
    overall[m.key] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }

  // 曜日ごとの負荷（課題の多さ＋試験の難易度＋出席の厳しさの平均）を見て、一番重い曜日を判定する
  const byWeekday = WEEKDAYS6.map((w) => {
    const dayCourses = courses.filter((c) => c.weekday === w);
    const scored = dayCourses
      .map((c) => {
        const s = c.syllabusCourseId ? summaries[c.id] : null;
        if (!s || !s.count) return null;
        const vals = [s.attendanceStrictness, s.assignmentVolume, s.examDifficulty].filter(
          (v): v is number => v !== null
        );
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })
      .filter((v): v is number => v !== null);
    const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    return { weekday: w, courseCount: dayCourses.length, avgLoad: avg };
  });
  const maxLoad = Math.max(0, ...byWeekday.map((d) => d.avgLoad ?? 0));
  const heaviestDay = byWeekday.find((d) => d.avgLoad !== null && d.avgLoad === maxLoad);

  return (
    <main className="flex-1 pb-8">
      <PageHeader title="今学期の負荷" />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        {semesterLabel(semester)}・{courses.length}科目中、授業カルテのデータがあるのは{withData.length}科目
      </p>

      {courses.length === 0 && (
        <div className="px-4">
          <Card>
            <p className="text-sm text-gray-400 text-center py-6">
              まだ{semesterLabel(semester)}の授業が登録されていません。
              <br />
              <Link href="/timetable" className="text-blue-600">
                時間割ページ
              </Link>
              から授業を追加すると、ここに今学期全体の負荷が表示されます。
            </p>
          </Card>
        </div>
      )}

      {courses.length > 0 && (
        <>
          <section className="px-4 mb-5">
            <Card>
              <p className="text-sm font-medium mb-3">全体の傾向（授業カルテの平均）</p>
              {!loaded ? (
                <p className="text-sm text-gray-400">集計中…</p>
              ) : withData.length === 0 ? (
                <p className="text-sm text-gray-400">
                  シラバス連携済みで、かつ授業カルテの投稿があるデータがまだありません。
                </p>
              ) : (
                <div className="space-y-2">
                  {METRICS.map((m) => (
                    <div key={m.key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600">{m.label}</span>
                      <StarRating value={overall[m.key]} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="px-4 mb-5">
            <p className="text-sm font-medium mb-2 px-0.5">曜日ごとの負荷</p>
            <div className="space-y-2">
              {byWeekday.map((d) => (
                <div key={d.weekday} className="rounded-2xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      {d.weekday}曜日
                      {heaviestDay && d.weekday === heaviestDay.weekday && d.avgLoad !== null && (
                        <span className="ml-2 text-[11px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                          最も負荷が重い
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      {d.courseCount > 0 ? `${d.courseCount}コマ` : "授業なし"}
                    </span>
                  </div>
                  {d.avgLoad !== null ? (
                    <ProgressBar value={d.avgLoad} max={5} />
                  ) : (
                    <p className="text-xs text-gray-300">カルテ情報なし</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="px-4">
            <p className="text-sm font-medium mb-2 px-0.5">授業ごとの内訳</p>
            <ul className="space-y-2">
              {courses.map((c) => {
                const s = c.syllabusCourseId ? summaries[c.id] : null;
                return (
                  <li key={c.id}>
                    <Link
                      href={c.syllabusCourseId ? `/karte/${c.syllabusCourseId}` : `/courses/${c.id}`}
                      className="block rounded-2xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-gray-400">
                          {c.weekday}{periodLabel(c.period, account?.university)}
                        </span>
                      </div>
                      {s && s.count > 0 ? (
                        <p className="text-xs text-gray-500">
                          出席{s.attendanceStrictness ?? "―"}・課題{s.assignmentVolume ?? "―"}・試験
                          {s.examDifficulty ?? "―"}（{s.count}件の評価）
                        </p>
                      ) : c.syllabusCourseId ? (
                        <p className="text-xs text-gray-300">まだ授業カルテの投稿がありません</p>
                      ) : (
                        <p className="text-xs text-gray-300">シラバス未連携のため集計対象外</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
