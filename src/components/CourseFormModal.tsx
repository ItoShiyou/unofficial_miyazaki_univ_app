"use client";

import { useEffect, useState } from "react";
import { db, newId, COURSE_COLORS, WEEKDAYS, type Course, type Weekday } from "@/lib/db";
import { PERIODS, periodLabel } from "@/lib/periods";
import type { SemesterKey } from "@/lib/semester";
import { useAccount } from "@/lib/useAccount";
import { universitySupportsSyllabusSync } from "@/lib/universities";

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
  const account = useAccount();
  const [step, setStep] = useState<"pick" | "details">(course ? "details" : "pick");
  const [query, setQuery] = useState("");
  const [rawHits, setRawHits] = useState<SyllabusHit[]>([]);
  const [hitsLoaded, setHitsLoaded] = useState(false);
  const hits = rawHits;

  const [name, setName] = useState(course?.name ?? "");
  const [teacher, setTeacher] = useState(course?.teacher ?? "");
  const [room, setRoom] = useState(course?.room ?? "");
  const [w, setW] = useState<Weekday>(course?.weekday ?? weekday ?? "月");
  const [p, setP] = useState<number>(course?.period ?? period ?? 1);
  const [absenceLimit, setAbsenceLimit] = useState<number>(
    course?.absenceLimit ?? 5
  );
  const [credits, setCredits] = useState<number | "">(course?.credits ?? 2);
  const [syllabusCourseId, setSyllabusCourseId] = useState<string | undefined>(
    course?.syllabusCourseId
  );
  const [rawAttendanceHint, setRawAttendanceHint] = useState<string | null>(null);
  const attendanceHint = syllabusCourseId ? rawAttendanceHint : null;

  useEffect(() => {
    if (step !== "pick" || !account) return;
    if (!universitySupportsSyllabusSync(account.university)) return;
    let ignore = false;
    const t = setTimeout(() => {
      setHitsLoaded(false);
      const params = new URLSearchParams({
        year: String(semester.year),
        semester: semester.semester,
        university: account.university,
      });
      if (query.trim()) params.set("q", query.trim());
      // 検索語が未入力の間は、選択中の曜日・時限に一致する授業をあらかじめ絞り込んで表示する
      if (!query.trim()) {
        params.set("weekday", w);
        params.set("period", String(p));
      }
      fetch(`/api/syllabus/search?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          if (!ignore) {
            setRawHits(d.courses ?? []);
            setHitsLoaded(true);
          }
        })
        .catch(() => {
          if (!ignore) {
            setRawHits([]);
            setHitsLoaded(true);
          }
        });
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [query, semester, step, w, p, account]);

  useEffect(() => {
    if (!syllabusCourseId) return;
    let ignore = false;
    fetch(`/api/syllabus/attendance-hint?syllabusCourseId=${syllabusCourseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setRawAttendanceHint(d.hint ?? null);
      })
      .catch(() => {
        if (!ignore) setRawAttendanceHint(null);
      });
    return () => {
      ignore = true;
    };
  }, [syllabusCourseId]);

  function pickHit(h: SyllabusHit) {
    setName(h.name);
    setTeacher(h.teacher ?? "");
    setRoom(h.room ?? "");
    if (h.weekday && WEEKDAYS.includes(h.weekday as Weekday)) setW(h.weekday as Weekday);
    if (h.period) setP(h.period);
    setSyllabusCourseId(h.id);
    setStep("details");
  }

  function enterManually() {
    setStep("details");
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
        credits: credits === "" ? undefined : credits,
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
        credits: credits === "" ? undefined : credits,
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
    // 試験予定は日付情報として意味を持つため削除はせず、授業との紐付けだけ解除する
    await db.examSlots
      .where("courseId")
      .equals(course.id)
      .modify({ courseId: undefined });
    await db.courses.delete(course.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[90vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "pick" ? (
          <div className="flex flex-col min-h-0 flex-1 p-5">
            <h2 className="text-lg font-semibold mb-1">授業を選ぶ</h2>
            <p className="text-xs text-gray-400 mb-3">
              {semester.year}年度 {semester.semester} のシラバスから検索します。
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={w}
                onChange={(e) => setW(e.target.value as Weekday)}
              >
                {WEEKDAYS.slice(0, 6).map((d) => (
                  <option key={d} value={d}>
                    {d}曜日
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={p}
                onChange={(e) => setP(Number(e.target.value))}
              >
                {PERIODS.map((n) => (
                  <option key={n} value={n}>
                    {periodLabel(n, account?.university)}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 mb-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="授業名で検索（例: 情報工学概論）"
              autoFocus
            />
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
              {account && !universitySupportsSyllabusSync(account.university) ? (
                <p className="text-sm text-gray-400 text-center mt-8">
                  この大学はまだシラバス連携に対応していないため、授業名での検索はできません。
                  <br />
                  下の「シラバスにない授業を手動で入力する」から登録してください。
                </p>
              ) : hits.length > 0 ? (
                <ul className="space-y-2">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => pickHit(h)}
                        className="w-full text-left rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                      >
                        <span className="font-medium block">{h.name}</span>
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {h.teacher}
                          {h.weekday && h.period ? ` ・ ${h.weekday}${periodLabel(h.period, account?.university)}` : ""}
                          {h.room && ` ・ ${h.room}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !hitsLoaded ? (
                <p className="text-sm text-gray-400 text-center mt-8">検索中…</p>
              ) : query.trim() ? (
                <p className="text-sm text-gray-400 text-center mt-8">
                  該当する授業が見つかりません。
                </p>
              ) : (
                <p className="text-sm text-gray-400 text-center mt-8">
                  {w}曜日{periodLabel(p, account?.university)}に該当する授業が見つかりません。
                  <br />
                  授業名で検索することもできます。
                </p>
              )}
            </div>
            <div className="pt-4 flex items-center justify-between">
              <button onClick={onClose} className="text-sm text-gray-400">
                キャンセル
              </button>
              <button onClick={enterManually} className="text-sm text-blue-600">
                シラバスにない授業を手動で入力する →
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto p-5">
            <div className="flex items-center gap-2 mb-4">
              {!course && (
                <button
                  onClick={() => setStep("pick")}
                  className="text-gray-400 text-lg"
                  aria-label="授業選択に戻る"
                >
                  ‹
                </button>
              )}
              <h2 className="text-lg font-semibold">
                {course ? "授業を編集" : "授業を追加"}
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">授業名</label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSyllabusCourseId(undefined);
                  }}
                  placeholder="例: 情報工学概論"
                />
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
                    {WEEKDAYS.slice(0, 6).map((d) => (
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
                    {PERIODS.map((n) => (
                      <option key={n} value={n}>
                        {periodLabel(n, account?.university)}
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

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs text-gray-500 mb-1">単位数</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                    value={credits}
                    onChange={(e) =>
                      setCredits(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                {attendanceHint && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                    <p className="font-medium mb-0.5">シラバスの履修上の注意より（自動抽出・抜粋）</p>
                    <p>{attendanceHint}</p>
                    <p className="text-amber-500 mt-1">
                      教員ごとに記載形式が異なるため、上限回数などが正しく抽出できていない場合があります。
                      単位に関わる正式な出欠方針は、必ず大学公式のシラバス本文でご確認ください。
                    </p>
                  </div>
                )}
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
        )}
      </div>
    </div>
  );
}
