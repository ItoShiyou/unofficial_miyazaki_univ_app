"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";
import { PageHeader } from "@/components/ui";

export default function TasksPage() {
  const todayStr = todayLocalDate();
  const [showDone, setShowDone] = useState(false);

  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const tasks = allTasks
    .filter((t) => (showDone ? true : !t.done))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  async function toggleTask(id: string, done: boolean) {
    await db.tasks.update(id, { done: !done });
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader
        title="課題一覧"
        right={
          <button
            onClick={() => setShowDone((v) => !v)}
            className="text-xs text-gray-400"
          >
            {showDone ? "未完了のみ表示" : "完了分も表示"}
          </button>
        }
      />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        すべての授業の課題を締切順にまとめて表示します。
      </p>

      <section className="px-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 mt-8 text-center">
            {showDone ? "課題がありません。" : "未完了の課題はありません。"}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => {
              const course = courseMap.get(t.courseId);
              const overdue = !t.done && t.dueDate && t.dueDate < todayStr;
              return (
                <li
                  key={t.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    overdue ? "border-red-200 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <button
                    onClick={() => toggleTask(t.id, t.done)}
                    aria-label={t.done ? "未完了に戻す" : "完了にする"}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      t.done ? "bg-gray-900 border-gray-900" : "border-gray-300"
                    }`}
                  >
                    {t.done && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${t.done ? "line-through text-gray-400" : ""}`}>
                      {course ? (
                        <Link href={`/courses/${course.id}`} className="text-gray-400 hover:underline">
                          {course.name}
                        </Link>
                      ) : (
                        "（授業不明）"
                      )}
                      ：{t.title}
                    </span>
                  </div>
                  {t.dueDate && (
                    <span
                      className={`text-xs flex-shrink-0 ${
                        overdue ? "text-red-500 font-medium" : "text-gray-400"
                      }`}
                    >
                      {t.dueDate === todayStr ? "今日まで" : t.dueDate}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
