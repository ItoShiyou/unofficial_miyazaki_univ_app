"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Link from "next/link";
import { db, WEEKDAYS, type Course, type Weekday } from "@/lib/db";
import { adjacentSemester, saveSemester, semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { PERIODS, periodTimeTable, periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";
import CourseFormModal from "@/components/CourseFormModal";
import CancellationReportsSection from "@/components/CancellationReportsSection";
import { exportTimetableCsv, importTimetableCsv } from "@/lib/csv";

function currentWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function TimetablePage() {
  const semester = useCurrentSemester();
  const account = useAccount();
  const periodTimes = periodTimeTable(account?.university);
  const [modalTarget, setModalTarget] = useState<
    { weekday: Weekday; period: number; course?: Course } | null
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const weekDates = currentWeekDates();
  const todayIdx = (new Date().getDay() + 6) % 7; // 0=Mon

  const courses =
    useLiveQuery(
      () =>
        db.courses
          .where("[year+semester]")
          .equals([semester.year, semester.semester])
          .toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  // 実データレビュー：知恵袋に「後期の履修は前期から自動的に引き継がれるのか」
  // という混同の実例が複数見つかった。学期ごとの時間割データ分離自体は正しく
  // 機能しているが、「なぜ後期は空になっているのか」が伝わらないと不安に
  // 感じる学生がいると考え、他の学期に登録実績がある（＝アプリを使い始めて
  // いる）場合に限って一言添える軽量な対応にとどめた。
  const hasAnyCourses = useLiveQuery(() => db.courses.count(), []) ?? 0;

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
  const todaysCourses = todayIdx < 6 ? courses.filter((c) => c.weekday === WEEKDAYS[todayIdx]) : [];

  function changeSemester(dir: 1 | -1) {
    const next = adjacentSemester(semester, dir);
    saveSemester(next);
  }

  function findCourse(w: Weekday, p: number) {
    return courses.find((c) => c.weekday === w && c.period === p);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const result = await importTimetableCsv(text, semester);
      const notes = [
        result.skipped ? `${result.skipped}件は形式不正でスキップ` : "",
        result.conflicted ? `${result.conflicted}件は時間割の重複でスキップ` : "",
      ].filter(Boolean);
      alert(`${result.imported}件の授業を読み込みました。${notes.length ? `（${notes.join(" / ")}）` : ""}`);
    } catch {
      alert("ファイルの読み込みに失敗しました。CSVの形式をご確認ください。");
    } finally {
      setMenuOpen(false);
    }
  }

  return (
    <main className="flex-1 pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-bold">時間割</h1>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-gray-400 text-xl px-2"
          >
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-20 overflow-hidden text-sm">
              <button
                onClick={() => exportTimetableCsv(courses)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
              >
                CSVエクスポート
              </button>
              <label className="block w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                CSVインポート
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <Link
                href="/simulator"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-left px-4 py-2.5 hover:bg-gray-50"
              >
                履修シミュレーター
              </Link>
              <Link
                href="/exams"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-left px-4 py-2.5 hover:bg-gray-50"
              >
                テスト期間の予定
              </Link>
              {/* UI/UX見直し：下部タブの「時間割」「記録」が同じ授業・出席関連の
                  機能で重複していたため、記録（欠席記録）は独立タブをやめ、
                  時間割ページのこのメニューから開く導線に統合した。空いたタブ枠は
                  「くらし」（お金・奨学金・教科書）に割り当てた。 */}
              <Link
                href="/records"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-left px-4 py-2.5 hover:bg-gray-50"
              >
                欠席記録
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 mt-1">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <button onClick={() => changeSemester(-1)} className="px-1">
            ‹
          </button>
          <span className="font-medium text-gray-700">{semesterLabel(semester)}</span>
          <button onClick={() => changeSemester(1)} className="px-1">
            ›
          </button>
        </div>
        {totalCredits > 0 && (
          <span className="text-xs text-gray-400">合計 {totalCredits} 単位</span>
        )}
      </div>

      <div className="grid grid-cols-6 text-center text-[11px] text-gray-400 px-4 mt-3">
        {weekDates.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span>{WEEKDAYS[i]}</span>
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full ${
                i === todayIdx ? "bg-gray-900 text-white" : ""
              }`}
            >
              {d.getMonth() + 1}/{d.getDate()}
            </span>
          </div>
        ))}
      </div>

      <div className="px-2 mt-2">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="w-9 text-center text-gray-400 align-top pt-2">
                  <div className="text-xs font-medium">{p}</div>
                  <div className="text-[8px] leading-tight whitespace-nowrap">
                    {periodTimes[p].split("–").map((t, i) => (
                      <div key={i}>{t}</div>
                    ))}
                  </div>
                </td>
                {WEEKDAYS.slice(0, 6).map((w) => {
                  const course = findCourse(w, p);
                  return (
                    <td key={w} className="p-0.5 align-top h-16">
                      <button
                        onClick={() =>
                          setModalTarget({ weekday: w, period: p, course })
                        }
                        className="w-full h-16 rounded-xl flex flex-col items-center justify-center overflow-hidden p-1"
                        style={
                          course
                            ? { backgroundColor: course.color }
                            : { backgroundColor: "#f8fafc", border: "1px dashed #e2e8f0" }
                        }
                      >
                        {course ? (
                          <>
                            <span
                              className="font-semibold leading-tight text-center break-words text-[11px] line-clamp-2"
                              style={{ color: course.textColor }}
                            >
                              {course.name}
                            </span>
                            {course.room && (
                              <span className="text-[10px]" style={{ color: course.textColor, opacity: 0.75 }}>
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

      <CancellationReportsSection todaysCourses={todaysCourses} />

      <div className="mt-6 px-4">
        <h2 className="text-sm font-medium text-gray-500 mb-2">登録済み授業一覧</h2>
        <ul className="space-y-1.5">
          {courses
            .slice()
            .sort(
              (a, b) =>
                WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) ||
                a.period - b.period
            )
            .map((c) => (
              <li
                key={c.id}
                className="flex items-stretch gap-1.5 rounded-xl border border-gray-200 overflow-hidden"
              >
                <Link
                  href={`/courses/${c.id}`}
                  className="flex-1 flex items-center justify-between px-3 py-2.5 min-w-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.textColor }}
                    />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {c.weekday}{periodLabel(c.period, account?.university)}
                  </span>
                </Link>
                {c.syllabusCourseId && (
                  <Link
                    href={`/karte/${c.syllabusCourseId}`}
                    className="flex-shrink-0 flex items-center px-3 text-xs text-blue-600 border-l border-gray-200 bg-gray-50"
                  >
                    カルテ
                  </Link>
                )}
              </li>
            ))}
          {courses.length === 0 && (
            <p className="text-sm text-gray-400">
              マス目の「+」をタップして授業を追加してください。
              {hasAnyCourses > 0 &&
                "時間割は学期ごとに別々に管理されるため、前の学期の授業は自動で引き継がれません。"}
            </p>
          )}
        </ul>
      </div>

      {modalTarget && (
        <CourseFormModal
          weekday={modalTarget.weekday}
          period={modalTarget.period}
          course={modalTarget.course}
          semester={semester}
          onClose={() => setModalTarget(null)}
        />
      )}
    </main>
  );
}
