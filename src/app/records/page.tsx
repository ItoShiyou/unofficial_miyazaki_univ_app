"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db, type Course } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { PageHeader, ProgressBar, IconChip, Icon } from "@/components/ui";
import StudySectionNav from "@/components/StudySectionNav";

export default function RecordsPage() {
  const [tab, setTab] = useState<"current" | "past">("current");
  const semester = useCurrentSemester();

  const allCourses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const attendances = useLiveQuery(() => db.attendances.toArray(), []) ?? [];

  const currentCourses = allCourses.filter(
    (c) => c.year === semester.year && c.semester === semester.semester
  );
  const pastCourses = allCourses.filter(
    (c) => !(c.year === semester.year && c.semester === semester.semester)
  );

  const list = tab === "current" ? currentCourses : pastCourses;

  function absentCount(courseId: string) {
    return attendances.filter((a) => a.courseId === courseId && a.status === "absent").length;
  }

  const grouped = new Map<string, Course[]>();
  if (tab === "past") {
    // IndexedDBの登録順のままだと学期の並びがバラバラになるため、
    // 直近の学期が上に来るよう年度・学期で並び替えてからグループ化する。
    const semesterRank = { 後期: 2, 通年: 1, 前期: 0 } as const;
    const sorted = [...list].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return semesterRank[b.semester] - semesterRank[a.semester];
    });
    for (const c of sorted) {
      const key = `${c.year}年度 ${c.semester}`;
      grouped.set(key, [...(grouped.get(key) ?? []), c]);
    }
  }

  return (
    <main className="flex-1 pb-4">
      <PageHeader title="欠席記録" />
      <div className="px-4 mb-4">
        <StudySectionNav />
      </div>

      <div className="flex gap-2 px-4 mb-3">
        <button
          onClick={() => setTab("current")}
          className={`flex-1 py-2 rounded-full text-sm font-medium ${
            tab === "current" ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          履修中
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 py-2 rounded-full text-sm font-medium ${
            tab === "past" ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          過去の授業
        </button>
      </div>

      {tab === "current" && (
        <p className="px-4 text-xs text-gray-400 mb-2">{semesterLabel(semester)}</p>
      )}

      <div className="px-4 space-y-3">
        {tab === "current" &&
          currentCourses.map((c) => {
            const count = absentCount(c.id);
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="flex gap-3 rounded-2xl border border-gray-200 p-4"
              >
                <IconChip tone="cyan"><Icon name="checklist" /></IconChip>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="font-medium truncate min-w-0">{c.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      あと{Math.max(c.absenceLimit - count, 0)}回 / 全{c.absenceLimit}回
                    </span>
                  </div>
                  <ProgressBar value={count} max={c.absenceLimit} />
                </div>
              </Link>
            );
          })}

        {tab === "current" && currentCourses.length === 0 && (
          <p className="text-sm text-gray-400">この学期の授業が登録されていません。</p>
        )}

        {tab === "past" &&
          Array.from(grouped.entries()).map(([label, cs]) => (
            <div key={label}>
              <h3 className="text-xs font-medium text-gray-400 mb-2">{label}</h3>
              <div className="space-y-3">
                {cs.map((c) => {
                  const count = absentCount(c.id);
                  return (
                    <Link
                      key={c.id}
                      href={`/courses/${c.id}`}
                      className="flex gap-3 rounded-2xl border border-gray-200 p-4"
                    >
                      <IconChip tone="gray"><Icon name="checklist" /></IconChip>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="font-medium truncate min-w-0">{c.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">欠席 {count}回</span>
                        </div>
                        <ProgressBar value={count} max={c.absenceLimit} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

        {tab === "past" && pastCourses.length === 0 && (
          <p className="text-sm text-gray-400">過去の学期の授業はまだありません。</p>
        )}
      </div>
    </main>
  );
}
