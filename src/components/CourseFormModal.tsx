"use client";

import { useState } from "react";
import { db, newId, COURSE_COLORS, WEEKDAYS, type Course, type Weekday } from "@/lib/db";

export default function CourseFormModal({
  weekday,
  period,
  course,
  onClose,
}: {
  weekday?: Weekday;
  period?: number;
  course?: Course;
  onClose: () => void;
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [teacher, setTeacher] = useState(course?.teacher ?? "");
  const [room, setRoom] = useState(course?.room ?? "");
  const [w, setW] = useState<Weekday>(course?.weekday ?? weekday ?? "月");
  const [p, setP] = useState<number>(course?.period ?? period ?? 1);
  const [absenceLimit, setAbsenceLimit] = useState<number>(
    course?.absenceLimit ?? 5
  );
  const [semester, setSemester] = useState<Course["semester"]>(
    course?.semester ?? "後期"
  );

  async function handleSave() {
    if (!name.trim()) return;
    if (course) {
      await db.courses.update(course.id, {
        name: name.trim(),
        teacher: teacher.trim(),
        room: room.trim(),
        weekday: w,
        period: p,
        absenceLimit,
        semester,
      });
    } else {
      await db.courses.add({
        id: newId(),
        name: name.trim(),
        teacher: teacher.trim(),
        room: room.trim(),
        weekday: w,
        period: p,
        year: new Date().getFullYear(),
        semester,
        absenceLimit,
        color: COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
        createdAt: Date.now(),
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!course) return;
    if (!confirm(`「${course.name}」を削除しますか？欠席記録・メモも削除されます。`))
      return;
    await db.attendances.where("courseId").equals(course.id).delete();
    await db.notes.where("courseId").equals(course.id).delete();
    await db.courses.delete(course.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          {course ? "授業を編集" : "授業を追加"}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">授業名</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 情報工学概論"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">曜日</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={w}
                onChange={(e) => setW(e.target.value as Weekday)}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">時限</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={p}
                onChange={(e) => setP(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}限
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">教員</label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">教室</label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">学期</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={semester}
                onChange={(e) =>
                  setSemester(e.target.value as Course["semester"])
                }
              >
                <option value="前期">前期</option>
                <option value="後期">後期</option>
                <option value="通年">通年</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                欠席上限（回）
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2"
                value={absenceLimit}
                onChange={(e) => setAbsenceLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {course && (
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
            className="rounded-lg px-4 py-2 bg-blue-600 text-white text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
