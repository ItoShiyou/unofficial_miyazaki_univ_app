"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { db, newId } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";
import CourseFormModal from "@/components/CourseFormModal";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [nextPreview, setNextPreview] = useState("");

  const course = useLiveQuery(() => db.courses.get(id), [id]);
  const attendances =
    useLiveQuery(
      () =>
        db.attendances
          .where("courseId")
          .equals(id)
          .reverse()
          .sortBy("date"),
      [id]
    ) ?? [];
  const notes =
    useLiveQuery(
      () => db.notes.where("courseId").equals(id).reverse().sortBy("date"),
      [id]
    ) ?? [];

  if (course === undefined) return null;
  if (course === null) {
    return <main className="p-4">授業が見つかりません。</main>;
  }

  const absentCount = attendances.filter((a) => a.status === "absent").length;
  const remaining = course.absenceLimit - absentCount;
  const warn = remaining <= 2;

  async function addAttendance(status: "absent" | "late") {
    await db.attendances.add({
      id: newId(),
      courseId: id,
      date: todayLocalDate(),
      status,
      createdAt: Date.now(),
    });
  }

  async function removeAttendance(attId: string) {
    await db.attendances.delete(attId);
  }

  async function addNote() {
    if (!noteText.trim() && !nextPreview.trim()) return;
    await db.notes.add({
      id: newId(),
      courseId: id,
      date: todayLocalDate(),
      content: noteText.trim(),
      nextPreview: nextPreview.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNoteText("");
    setNextPreview("");
  }

  async function removeNote(noteId: string) {
    await db.notes.delete(noteId);
  }

  return (
    <main className="flex-1 p-4 max-w-lg mx-auto w-full">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-2"
      >
        ← 戻る
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: course.color }}>
            {course.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {course.weekday}{course.period}限 ・ {course.teacher || "教員未設定"}
            {course.room ? ` ・ ${course.room}` : ""}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1"
        >
          編集
        </button>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-2">欠席管理</h2>
        <div
          className={`rounded-xl p-4 mb-3 ${
            warn
              ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900"
              : "bg-gray-50 dark:bg-white/5"
          }`}
        >
          <p className="text-sm">
            欠席 <span className="font-semibold">{absentCount}</span> / 上限{" "}
            {course.absenceLimit} 回
          </p>
          <p
            className={`text-sm mt-1 font-medium ${
              warn ? "text-red-600" : "text-gray-600"
            }`}
          >
            {remaining > 0
              ? `あと${remaining}回まで欠席可能`
              : "欠席上限に達しています"}
          </p>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => addAttendance("absent")}
            className="flex-1 rounded-lg bg-red-600 text-white text-sm py-2"
          >
            欠席を記録
          </button>
          <button
            onClick={() => addAttendance("late")}
            className="flex-1 rounded-lg bg-amber-500 text-white text-sm py-2"
          >
            遅刻を記録
          </button>
        </div>
        {attendances.length > 0 && (
          <ul className="space-y-1">
            {attendances.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5"
              >
                <span>
                  {a.date} ・ {a.status === "absent" ? "欠席" : "遅刻"}
                </span>
                <button
                  onClick={() => removeAttendance(a.id)}
                  className="text-xs text-gray-400"
                >
                  取り消し
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-2">授業メモ</h2>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 mb-3 space-y-2">
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            rows={3}
            placeholder="授業内容・課題・試験情報など"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            placeholder="次回予告（例: 次回小テストあり）"
            value={nextPreview}
            onChange={(e) => setNextPreview(e.target.value)}
          />
          <button
            onClick={addNote}
            className="w-full rounded-lg bg-blue-600 text-white text-sm py-2"
          >
            メモを保存
          </button>
        </div>

        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-gray-200 dark:border-white/10 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{n.date}</span>
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-xs text-gray-400"
                >
                  削除
                </button>
              </div>
              {n.content && (
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              )}
              {n.nextPreview && (
                <p className="text-sm mt-1 text-blue-600">
                  次回: {n.nextPreview}
                </p>
              )}
            </li>
          ))}
          {notes.length === 0 && (
            <p className="text-sm text-gray-400">まだメモがありません。</p>
          )}
        </ul>
      </section>

      {editing && (
        <CourseFormModal course={course} onClose={() => setEditing(false)} />
      )}
    </main>
  );
}
