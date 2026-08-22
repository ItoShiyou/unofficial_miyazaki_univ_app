"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db, type ExamSlot } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";
import { useCurrentSemester } from "@/lib/useSemester";
import { semesterLabel } from "@/lib/semester";
import { PageHeader, IconChip, Icon } from "@/components/ui";
import ExamFormModal from "@/components/ExamFormModal";
import StudySectionNav from "@/components/StudySectionNav";

export default function ExamsPage() {
  const semester = useCurrentSemester();
  const todayStr = todayLocalDate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamSlot | undefined>(undefined);

  const courses =
    useLiveQuery(
      () =>
        db.courses
          .where("[year+semester]")
          .equals([semester.year, semester.semester])
          .toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  const exams =
    useLiveQuery(
      () =>
        db.examSlots
          .where("[year+semester]")
          .equals([semester.year, semester.semester])
          .sortBy("date"),
      [semester.year, semester.semester]
    ) ?? [];

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  function openNew() {
    setEditing(undefined);
    setModalOpen(true);
  }

  function openEdit(exam: ExamSlot) {
    setEditing(exam);
    setModalOpen(true);
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader
        title="テスト期間の予定"
        right={
          <button
            onClick={openNew}
            className="rounded-full bg-rose-50 text-rose-700 text-sm font-medium px-3 py-1.5"
          >
            ＋追加
          </button>
        }
      />
      <div className="px-4 mb-4">
        <StudySectionNav />
      </div>
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">{semesterLabel(semester)}</p>

      <section className="px-4">
        {exams.length === 0 ? (
          <p className="text-sm text-gray-400 mt-8 text-center">
            まだ試験の予定が登録されていません。
            <br />
            「＋追加」から、テスト期間の試験日程を自分で登録できます。
          </p>
        ) : (
          <ul className="space-y-2">
            {exams.map((exam) => {
              const course = exam.courseId ? courseMap.get(exam.courseId) : undefined;
              const isPast = exam.date < todayStr;
              const isToday = exam.date === todayStr;
              return (
                <li key={exam.id}>
                  <button
                    onClick={() => openEdit(exam)}
                    className={`w-full text-left rounded-2xl border p-4 flex gap-3 ${
                      isToday
                        ? "border-amber-300 bg-amber-50"
                        : isPast
                        ? "border-gray-100 bg-gray-50 opacity-60"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <IconChip tone={isToday ? "amber" : "rose"}>
                      <Icon name="flag" />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {exam.date}
                          {isToday && <span className="ml-1.5 text-amber-600 font-medium">今日</span>}
                        </span>
                        {(exam.startTime || exam.endTime) && (
                          <span className="text-xs text-gray-400">
                            {exam.startTime ?? ""}
                            {exam.startTime && exam.endTime ? "〜" : ""}
                            {exam.endTime ?? ""}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{exam.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[course?.name, exam.room].filter(Boolean).join(" ・ ") || undefined}
                      </p>
                      {exam.note && (
                        <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">{exam.note}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="px-4 mt-6 text-xs text-gray-400 text-center">
        <Link href="/timetable" className="text-blue-600">
          時間割ページ
        </Link>
        に戻る
      </p>

      {modalOpen && (
        <ExamFormModal
          courses={courses}
          exam={editing}
          semester={semester}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
