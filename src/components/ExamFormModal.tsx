"use client";

import { useState } from "react";
import { db, newId, type Course, type ExamSlot } from "@/lib/db";
import type { SemesterKey } from "@/lib/semester";

export default function ExamFormModal({
  courses,
  exam,
  semester,
  onClose,
}: {
  courses: Course[];
  exam?: ExamSlot;
  semester: SemesterKey;
  onClose: () => void;
}) {
  const [courseId, setCourseId] = useState<string>(exam?.courseId ?? "");
  const [title, setTitle] = useState(exam?.title ?? "");
  const [date, setDate] = useState(exam?.date ?? "");
  const [startTime, setStartTime] = useState(exam?.startTime ?? "");
  const [endTime, setEndTime] = useState(exam?.endTime ?? "");
  const [room, setRoom] = useState(exam?.room ?? "");
  const [note, setNote] = useState(exam?.note ?? "");

  function pickCourse(id: string) {
    setCourseId(id);
    const c = courses.find((c) => c.id === id);
    if (c && !title.trim()) setTitle(c.name);
  }

  async function handleSave() {
    if (!title.trim() || !date) return;
    if (exam) {
      await db.examSlots.update(exam.id, {
        courseId: courseId || undefined,
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        room: room.trim() || undefined,
        note: note.trim() || undefined,
      });
    } else {
      await db.examSlots.add({
        id: newId(),
        courseId: courseId || undefined,
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        room: room.trim() || undefined,
        note: note.trim() || undefined,
        year: semester.year,
        semester: semester.semester,
        createdAt: Date.now(),
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!exam) return;
    if (!confirm(`「${exam.title}」の予定を削除しますか？`)) return;
    await db.examSlots.delete(exam.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          {exam ? "試験予定を編集" : "試験予定を追加"}
        </h2>

        <div className="space-y-3">
          {courses.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                登録済みの授業と紐付け（任意）
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={courseId}
                onChange={(e) => pickCourse(e.target.value)}
              >
                <option value="">紐付けない</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">試験名・授業名</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 情報セキュリティ 期末試験"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">日付</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">開始時刻</label>
              <input
                type="time"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">終了時刻</label>
              <input
                type="time"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">教室</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ（持ち込み可否など）</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <p className="text-xs text-gray-400">
            {semester.year}年度 {semester.semester} の予定として登録されます。
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          {exam && (
            <button
              onClick={handleDelete}
              className="rounded-lg px-4 py-2 text-red-600 border border-red-300 text-sm"
            >
              削除
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
