"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db, WEEKDAYS } from "@/lib/db";

function todayWeekday() {
  // JS: 0=Sun..6=Sat -> WEEKDAYS: 月火水木金土日
  const map = [6, 0, 1, 2, 3, 4, 5];
  return WEEKDAYS[map[new Date().getDay()]];
}

export default function Home() {
  const today = todayWeekday();
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const attendances = useLiveQuery(() => db.attendances.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];

  const todayCourses = courses
    .filter((c) => c.weekday === today)
    .sort((a, b) => a.period - b.period);

  const warnings = courses
    .map((c) => {
      const count = attendances.filter(
        (a) => a.courseId === c.id && a.status === "absent"
      ).length;
      return { course: c, remaining: c.absenceLimit - count };
    })
    .filter((w) => w.remaining <= 2);

  const previews = courses
    .map((c) => {
      const latest = notes
        .filter((n) => n.courseId === c.id && n.nextPreview)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      return latest ? { course: c, note: latest } : null;
    })
    .filter((v): v is NonNullable<typeof v> => !!v);

  return (
    <main className="flex-1 p-4 max-w-lg mx-auto w-full">
      <h1 className="text-lg font-semibold mb-1">今日やること</h1>
      <p className="text-xs text-gray-400 mb-4">
        {new Date().toLocaleDateString("ja-JP", {
          month: "long",
          day: "numeric",
          weekday: "short",
        })}
      </p>

      <section className="mb-5">
        <h2 className="text-sm font-medium text-gray-500 mb-2">
          今日の授業（{today}曜）
        </h2>
        {todayCourses.length === 0 && (
          <p className="text-sm text-gray-400">今日の授業はありません。</p>
        )}
        <ul className="space-y-1">
          {todayCourses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2"
              >
                <span>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.period}限 {c.name}
                </span>
                {c.room && (
                  <span className="text-xs text-gray-400">{c.room}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {warnings.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-medium text-gray-500 mb-2">欠席の警告</h2>
          <ul className="space-y-1">
            {warnings.map(({ course, remaining }) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="block rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-600"
                >
                  {course.name}：
                  {remaining > 0
                    ? `あと${remaining}回まで欠席可能`
                    : "欠席上限に達しています"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {previews.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-medium text-gray-500 mb-2">次回予告</h2>
          <ul className="space-y-1">
            {previews.map(({ course, note }) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="block rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-sm"
                >
                  <span style={{ color: course.color }}>{course.name}</span>：
                  {note.nextPreview}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length === 0 && (
        <p className="text-sm text-gray-400 mt-8 text-center">
          まだ授業が登録されていません。
          <br />
          <Link href="/timetable" className="text-blue-600">
            時間割ページ
          </Link>
          から授業を追加しましょう。
        </p>
      )}
    </main>
  );
}
