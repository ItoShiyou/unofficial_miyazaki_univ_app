"use client";

import { useEffect, useState } from "react";
import { db, newId, COURSE_COLORS, WEEKDAYS, type Course, type Weekday } from "@/lib/db";
import type { SemesterKey } from "@/lib/semester";

interface SyllabusHit {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  weekday: string | null;
  period: number | null;
}

export default function CourseFormModal({
  weekday,
  period,
  course,
  semester,
  onClose,
}: {
  weekday?: Weekday;
  period?: number;
  course?: Course;
  semester: SemesterKey;
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
  const [syllabusCourseId, setSyllabusCourseId] = useState<string | undefined>(
    course?.syllabusCourseId
  );
  const [rawHits, setRawHits] = useState<SyllabusHit[]>([]);
  const hits = name.trim() && !course ? rawHits : [];

  useEffect(() => {
    if (!name.trim() || course) return;
    const t = setTimeout(() => {
      fetch(
        `/api/syllabus/search?q=${encodeURIComponent(name.trim())}&year=${semester.year}&semester=${semester.semester}`
      )
        .then((r) => r.json())
        .then((d) => setRawHits(d.courses ?? []))
        .catch(() => setRawHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [name, course, semester]);

  function applyHit(h: SyllabusHit) {
    setName(h.name);
    setTeacher(h.teacher ?? "");
    setRoom(h.room ?? "");
    if (h.weekday && WEEKDAYS.includes(h.weekday as Weekday)) setW(h.weekday as Weekday);
    if (h.period) setP(h.period);
    setSyllabusCourseId(h.id);
    setRawHits([]);
  }

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
        syllabusCourseId,
      });
    } else {
      const palette = COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)];
      await db.courses.add({
        id: newId(),
        name: name.trim(),
        teacher: teacher.trim(),
        room: room.trim(),
        weekday: w,
        period: p,
        year: semester.year,
        semester: semester.semester,
        absenceLimit,
        color: palette.bg,
        textColor: palette.text,
        syllabusCourseId,
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
    await db.tasks.where("courseId").equals(course.id).delete();
    await db.courses.delete(course.id);
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
          {course ? "授業を編集" : "授業を追加"}
        </h2>

        <div className="space-y-3">
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">授業名</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSyllabusCourseId(undefined);
              }}
              placeholder="例: 情報工学概論"
              autoFocus
            />
            {hits.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => applyHit(h)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{h.name}</span>
                      <span className="block text-xs text-gray-400">
                        {h.teacher} {h.room && `・${h.room}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {syllabusCourseId && (
              <p className="text-xs text-emerald-600 mt-1">
                シラバスと連携済み（授業カルテを閲覧できます）
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">曜日</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
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
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
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
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">教室</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              欠席上限（回）
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={absenceLimit}
              onChange={(e) => setAbsenceLimit(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-gray-400">
            {semester.year}年度 {semester.semester} の授業として登録されます。
          </p>
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
            className="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
