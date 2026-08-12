"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db, newId } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";
import { periodLabel } from "@/lib/periods";
import CourseFormModal from "@/components/CourseFormModal";
import { ProgressBar } from "@/components/ui";

interface SyllabusChangeEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
}

const FIELD_LABEL: Record<string, string> = {
  teacher: "担当教員",
  schedule: "曜日・時限",
  removed: "掲載状況",
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"memo" | "task">("memo");
  const [noteText, setNoteText] = useState("");
  const [nextPreview, setNextPreview] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [rawSyllabusChanges, setRawSyllabusChanges] = useState<SyllabusChangeEntry[]>([]);

  const course = useLiveQuery(() => db.courses.get(id), [id]);
  const syllabusChanges = course?.syllabusCourseId ? rawSyllabusChanges : [];

  useEffect(() => {
    if (!course?.syllabusCourseId) return;
    let ignore = false;
    fetch(`/api/syllabus/changes?syllabusCourseId=${course.syllabusCourseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setRawSyllabusChanges(d.changes ?? []);
      })
      .catch(() => {
        if (!ignore) setRawSyllabusChanges([]);
      });
    return () => {
      ignore = true;
    };
  }, [course?.syllabusCourseId]);
  const attendances =
    useLiveQuery(
      () => db.attendances.where("courseId").equals(id).reverse().sortBy("date"),
      [id]
    ) ?? [];
  const notes =
    useLiveQuery(
      () => db.notes.where("courseId").equals(id).reverse().sortBy("date"),
      [id]
    ) ?? [];
  const tasks =
    useLiveQuery(
      () => db.tasks.where("courseId").equals(id).reverse().sortBy("createdAt"),
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

  async function addTask() {
    if (!taskTitle.trim()) return;
    await db.tasks.add({
      id: newId(),
      courseId: id,
      title: taskTitle.trim(),
      dueDate: taskDue || undefined,
      done: false,
      createdAt: Date.now(),
    });
    setTaskTitle("");
    setTaskDue("");
  }

  async function toggleTask(taskId: string, done: boolean) {
    await db.tasks.update(taskId, { done: !done });
  }

  async function removeTask(taskId: string) {
    await db.tasks.delete(taskId);
  }

  return (
    <main className="flex-1 pb-6">
      <div className="flex items-center justify-between px-4 pt-4 mb-1">
        <button onClick={() => router.back()} className="text-gray-400 text-lg">
          ‹
        </button>
        <span className="text-sm text-gray-400">授業詳細</span>
        <button onClick={() => setEditing(true)} className="text-gray-400 text-lg">
          ⋯
        </button>
      </div>

      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {course.room ?? "教室未設定"} ・ {course.weekday}{periodLabel(course.period)}
          {course.teacher ? ` ・ ${course.teacher}` : ""}
        </p>
        {course.syllabusCourseId && (
          <Link
            href={`/karte/${course.syllabusCourseId}`}
            className="inline-block mt-2 text-xs text-blue-600 border border-blue-200 rounded-full px-3 py-1"
          >
            授業カルテを見る
          </Link>
        )}
      </div>

      {syllabusChanges.length > 0 && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-700 mb-2">
              シラバスの変更が検知されました
            </p>
            <ul className="space-y-1.5">
              {syllabusChanges.map((c) => (
                <li key={c.id} className="text-xs text-amber-700">
                  {c.field === "removed" ? (
                    <>この授業はシラバスから掲載終了になっています</>
                  ) : (
                    <>
                      {FIELD_LABEL[c.field] ?? c.field}：{c.oldValue || "（空）"} →{" "}
                      <span className="font-semibold">{c.newValue || "（空）"}</span>
                    </>
                  )}
                  <span className="text-amber-500">
                    （{new Date(c.detectedAt).toLocaleDateString("ja-JP")}検知）
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="px-4 mb-5">
        <div
          className={`rounded-2xl p-4 mb-3 border ${
            warn ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">
              欠席 <span className="font-semibold">{absentCount}</span> / 上限{" "}
              {course.absenceLimit} 回
            </span>
            <span className={`text-xs font-medium ${warn ? "text-red-600" : "text-gray-500"}`}>
              {remaining > 0 ? `あと${remaining}回まで欠席可能` : "上限に達しています"}
            </span>
          </div>
          <ProgressBar value={absentCount} max={course.absenceLimit} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => addAttendance("absent")}
            className="flex-1 rounded-xl bg-red-500 text-white text-sm py-2.5 font-medium"
          >
            欠席を記録
          </button>
          <button
            onClick={() => addAttendance("late")}
            className="flex-1 rounded-xl bg-amber-500 text-white text-sm py-2.5 font-medium"
          >
            遅刻を記録
          </button>
        </div>
        {attendances.length > 0 && (
          <ul className="mt-2 space-y-1">
            {attendances.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-xs rounded-lg border border-gray-100 px-3 py-1.5 text-gray-500"
              >
                <span>
                  {a.date} ・ {a.status === "absent" ? "欠席" : "遅刻"}
                </span>
                <button onClick={() => removeAttendance(a.id)} className="text-gray-400">
                  取り消し
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-4 flex gap-2 mb-3">
        <button
          onClick={() => setTab("memo")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            tab === "memo" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          メモ
        </button>
        <button
          onClick={() => setTab("task")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            tab === "task" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          タスク
        </button>
      </div>

      {tab === "memo" && (
        <section className="px-4">
          <div className="rounded-2xl border border-gray-200 p-3 mb-3 space-y-2">
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm"
              rows={3}
              placeholder="授業内容・課題・試験情報など"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm"
              placeholder="次回予告（例: 次回小テストあり）"
              value={nextPreview}
              onChange={(e) => setNextPreview(e.target.value)}
            />
            <button
              onClick={addNote}
              className="w-full rounded-lg bg-gray-900 text-white text-sm py-2"
            >
              メモを保存
            </button>
          </div>

          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{n.date}</span>
                  <button onClick={() => removeNote(n.id)} className="text-xs text-gray-400">
                    削除
                  </button>
                </div>
                {n.content && <p className="text-sm whitespace-pre-wrap">{n.content}</p>}
                {n.nextPreview && (
                  <p className="text-sm mt-2 rounded-lg bg-blue-50 text-blue-700 px-3 py-2">
                    次回予告：{n.nextPreview}
                  </p>
                )}
              </li>
            ))}
            {notes.length === 0 && (
              <p className="text-sm text-gray-400">まだメモがありません。</p>
            )}
          </ul>
        </section>
      )}

      {tab === "task" && (
        <section className="px-4">
          <div className="rounded-2xl border border-gray-200 p-3 mb-3 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm"
              placeholder="例: レポート提出"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <input
              type="date"
              className="rounded-lg border border-gray-300 bg-transparent px-2 py-2 text-sm"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
            />
            <button
              onClick={addTask}
              className="rounded-lg bg-gray-900 text-white text-sm px-3"
            >
              追加
            </button>
          </div>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
              >
                <button
                  onClick={() => toggleTask(t.id, t.done)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      t.done ? "bg-gray-900 border-gray-900" : "border-gray-300"
                    }`}
                  >
                    {t.done && <span className="text-white text-xs">✓</span>}
                  </span>
                  <span className={`text-sm ${t.done ? "line-through text-gray-400" : ""}`}>
                    {t.title}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {t.dueDate && <span className="text-xs text-gray-400">{t.dueDate}</span>}
                  <button onClick={() => removeTask(t.id)} className="text-xs text-gray-400">
                    削除
                  </button>
                </div>
              </li>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-gray-400">まだタスクがありません。</p>
            )}
          </ul>
        </section>
      )}

      {editing && (
        <CourseFormModal
          course={course}
          semester={{ year: course.year, semester: course.semester === "通年" ? "前期" : course.semester }}
          onClose={() => setEditing(false)}
        />
      )}
    </main>
  );
}
