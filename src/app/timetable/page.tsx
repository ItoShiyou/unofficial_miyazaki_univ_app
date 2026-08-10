"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db, WEEKDAYS, type Course, type Weekday } from "@/lib/db";
import CourseFormModal from "@/components/CourseFormModal";

const PERIODS = [1, 2, 3, 4, 5, 6];

export default function TimetablePage() {
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [modalTarget, setModalTarget] = useState<
    { weekday: Weekday; period: number; course?: Course } | null
  >(null);

  function findCourse(w: Weekday, p: number) {
    return courses.find((c) => c.weekday === w && c.period === p);
  }

  return (
    <main className="flex-1 p-3">
      <h1 className="text-lg font-semibold mb-3">時間割</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm min-w-[560px]">
          <thead>
            <tr>
              <th className="w-8"></th>
              {WEEKDAYS.slice(0, 6).map((w) => (
                <th key={w} className="p-1 font-medium text-gray-500">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="text-center text-gray-400 pr-1">{p}</td>
                {WEEKDAYS.slice(0, 6).map((w) => {
                  const course = findCourse(w, p);
                  return (
                    <td key={w} className="p-0.5 align-top h-16">
                      <button
                        onClick={() =>
                          setModalTarget({ weekday: w, period: p, course })
                        }
                        className="w-full h-16 rounded-lg border border-dashed border-gray-300 dark:border-white/15 flex flex-col items-center justify-center overflow-hidden p-1"
                        style={
                          course
                            ? {
                                backgroundColor: course.color + "22",
                                borderColor: course.color,
                                borderStyle: "solid",
                              }
                            : undefined
                        }
                      >
                        {course ? (
                          <>
                            <span
                              className="font-medium leading-tight text-center break-words"
                              style={{ color: course.color }}
                            >
                              {course.name}
                            </span>
                            {course.room && (
                              <span className="text-[10px] text-gray-500">
                                {course.room}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300 text-lg">+</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-500 mb-2">登録済み授業一覧</h2>
        <ul className="space-y-1">
          {courses
            .slice()
            .sort(
              (a, b) =>
                WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) ||
                a.period - b.period
            )
            .map((c) => (
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
                    {c.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.weekday}{c.period}限
                  </span>
                </Link>
              </li>
            ))}
          {courses.length === 0 && (
            <p className="text-sm text-gray-400">
              マス目の「+」をタップして授業を追加してください。
            </p>
          )}
        </ul>
      </div>

      {modalTarget && (
        <CourseFormModal
          weekday={modalTarget.weekday}
          period={modalTarget.period}
          course={modalTarget.course}
          onClose={() => setModalTarget(null)}
        />
      )}
    </main>
  );
}
