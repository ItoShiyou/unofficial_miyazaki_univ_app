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
import StudySectionNav from "@/components/StudySectionNav";
import { exportTimetableCsv, importTimetableCsv } from "@/lib/csv";

function currentWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function formatPeriodTime(time: string | undefined) {
  return (time ?? "").split("–").filter(Boolean);
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
  const todayIdx = (new Date().getDay() + 6) % 7;
  const courses =
    useLiveQuery(
      () =>
        db.courses
          .where("[year+semester]")
          .equals([semester.year, semester.semester])
          .toArray(),
      [semester.year, semester.semester]
    ) ?? [];
  const hasAnyCourses = useLiveQuery(() => db.courses.count(), []) ?? 0;
  const totalCredits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);
  const todaysCourses =
    todayIdx < 6
      ? courses
          .filter((course) => course.weekday === WEEKDAYS[todayIdx])
          .sort((a, b) => a.period - b.period)
      : [];

  const currentPeriod = (() => {
    if (todayIdx >= 6) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return (
      PERIODS.find((period) => {
        const times = (periodTimes[period] ?? "").match(/\d{1,2}:\d{2}/g);
        if (!times || times.length < 2) return false;
        const [start, end] = times.map((time) => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        });
        return nowMinutes >= start && nowMinutes < end;
      }) ?? null
    );
  })();

  const nextCourse =
    todaysCourses.find((course) => course.period === currentPeriod) ??
    todaysCourses.find((course) => currentPeriod === null || course.period > currentPeriod) ??
    null;

  function changeSemester(direction: 1 | -1) {
    saveSemester(adjacentSemester(semester, direction));
  }

  function findCourse(weekday: Weekday, period: number) {
    return courses.find((course) => course.weekday === weekday && course.period === period);
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
    <main className="flex-1 pb-8">
      <div className="px-4 pt-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-700">ACADEMIC</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950">時間割</h1>
            <p className="mt-1 text-sm text-slate-500">今週の授業と、次にすることを確認</p>
          </div>
          <div className="relative pt-1">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="時間割の管理メニューを開く"
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-xl leading-none text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <span aria-hidden="true">···</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-950/10">
                <button
                  type="button"
                  onClick={() => exportTimetableCsv(courses)}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  CSVをエクスポート
                </button>
                <label className="block w-full cursor-pointer px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  CSVをインポート
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleImportFile(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </header>

        <div className="mt-4">
          <StudySectionNav />
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 p-4 text-white shadow-lg shadow-sky-900/15">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-sky-100">{todayIdx < 6 ? `今日・${WEEKDAYS[todayIdx]}曜日` : "今週の授業"}</p>
              <h2 className="mt-1 text-lg font-bold">
                {nextCourse ? nextCourse.name : todayIdx < 6 ? "今日の授業は終了しました" : "ゆっくり週末を過ごしましょう"}
              </h2>
              <p className="mt-1 text-sm text-sky-100">
                {nextCourse
                  ? `${currentPeriod === nextCourse.period ? "ただいま" : "次は"} ${periodLabel(nextCourse.period, account?.university)}${nextCourse.room ? `・${nextCourse.room}` : ""}`
                  : todaysCourses.length > 0
                    ? `${todaysCourses.length}コマの予定を確認済み`
                    : "予定はありません"}
              </p>
            </div>
            {nextCourse ? (
              <Link
                href={`/courses/${nextCourse.id}`}
                className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                詳細
              </Link>
            ) : (
              <Link
                href="/simulator"
                className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                履修を組む
              </Link>
            )}
          </div>
          <div className="mt-4 flex gap-2 text-xs">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-sky-50">登録 {courses.length}件</span>
            {totalCredits > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1 text-sky-50">{totalCredits}単位</span>}
            {todaysCourses.length > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1 text-sky-50">今日 {todaysCourses.length}コマ</span>}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold tracking-wide text-slate-500">表示する学期</p>
            {totalCredits > 0 && <p className="text-xs font-medium text-slate-500">合計 {totalCredits} 単位</p>}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeSemester(-1)}
              aria-label="前の学期を表示"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-slate-800">{semesterLabel(semester)}</span>
            <button
              type="button"
              onClick={() => changeSemester(1)}
              aria-label="次の学期を表示"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              ›
            </button>
          </div>
        </section>
      </div>

      <section aria-labelledby="weekly-timetable-heading" className="mt-5">
        <div className="flex items-end justify-between px-4">
          <div>
            <h2 id="weekly-timetable-heading" className="text-base font-bold text-slate-900">週間スケジュール</h2>
            <p className="mt-0.5 text-xs text-slate-500">授業をタップして編集・空きコマをタップして追加</p>
          </div>
          <span className="text-xs font-medium text-slate-400">横にスクロール</span>
        </div>

        <div className="mt-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
          <div className="min-w-[38rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[3.5rem_repeat(6,minmax(5.75rem,1fr))] border-b border-slate-200 bg-slate-50">
              <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-semibold tracking-wide text-slate-400">時限</div>
              {weekDates.map((date, index) => {
                const isToday = index === todayIdx;
                return (
                  <div key={date.toISOString()} className="border-r border-slate-100 px-1 py-2 last:border-r-0">
                    <div className={`mx-auto grid h-10 w-10 place-items-center rounded-xl text-center ${isToday ? "bg-sky-600 text-white shadow-sm" : "text-slate-600"}`}>
                      <span className="text-[10px] font-semibold leading-none">{WEEKDAYS[index]}</span>
                      <span className="text-xs font-bold leading-none">{date.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[3.5rem_repeat(6,minmax(5.75rem,1fr))]">
              {PERIODS.flatMap((period) => {
                const isCurrentPeriod = period === currentPeriod;
                const time = formatPeriodTime(periodTimes[period]);
                const cells = [
                  <div
                    key={`time-${period}`}
                    className={`sticky left-0 z-10 flex min-h-[5.45rem] flex-col items-center border-b border-r border-slate-200 px-1 pt-3 text-center ${isCurrentPeriod ? "bg-sky-50" : "bg-white"}`}
                  >
                    <span className={`text-xs font-bold ${isCurrentPeriod ? "text-sky-700" : "text-slate-700"}`}>{period}</span>
                    <span className="mt-1 text-[9px] leading-tight text-slate-400">{time.map((part) => <span key={part} className="block">{part}</span>)}</span>
                    {isCurrentPeriod && <span className="mt-1 rounded-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white">いま</span>}
                  </div>,
                ];

                WEEKDAYS.slice(0, 6).forEach((weekday, weekdayIndex) => {
                  const course = findCourse(weekday, period);
                  const isTodayColumn = weekdayIndex === todayIdx;
                  cells.push(
                    <div
                      key={`${weekday}-${period}`}
                      className={`min-h-[5.45rem] border-b border-r border-slate-100 p-1.5 last:border-r-0 ${isTodayColumn ? "bg-sky-50/40" : "bg-white"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setModalTarget({ weekday, period, course })}
                        aria-label={course ? `${weekday}曜${period}限 ${course.name}を編集` : `${weekday}曜${period}限に授業を追加`}
                        className={`group flex min-h-[4.7rem] w-full flex-col justify-between rounded-xl p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                          course
                            ? "shadow-sm ring-1 ring-inset ring-black/5 hover:-translate-y-0.5 hover:shadow-md"
                            : "border border-dashed border-slate-200 bg-slate-50/70 hover:border-sky-300 hover:bg-sky-50"
                        } ${isCurrentPeriod && isTodayColumn ? "ring-2 ring-sky-500 ring-offset-1" : ""}`}
                        style={course ? { backgroundColor: course.color } : undefined}
                      >
                        {course ? (
                          <>
                            <span className="line-clamp-2 text-[12px] font-bold leading-snug" style={{ color: course.textColor }}>{course.name}</span>
                            <span className="mt-1 truncate text-[10px] font-medium" style={{ color: course.textColor, opacity: 0.78 }}>{course.room || "授業詳細を見る"}</span>
                          </>
                        ) : (
                          <span className="flex h-full items-center justify-center gap-1 text-[11px] font-medium text-slate-400 transition group-hover:text-sky-600"><span className="text-lg font-light leading-none">＋</span>追加</span>
                        )}
                      </button>
                    </div>
                  );
                });
                return cells;
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 px-4">
        <CancellationReportsSection todaysCourses={todaysCourses} />
      </div>

      <section className="mt-6 px-4" aria-labelledby="course-list-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="course-list-heading" className="text-base font-bold text-slate-900">登録済みの授業</h2>
            <p className="mt-0.5 text-xs text-slate-500">タップして授業の記録・課題・詳細へ</p>
          </div>
          {courses.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{courses.length}件</span>}
        </div>

        {courses.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {courses
              .slice()
              .sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) || a.period - b.period)
              .map((course) => (
                <li key={course.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                  <Link href={`/courses/${course.id}`} className="flex items-center gap-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-600">
                    <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: course.textColor }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">{course.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{course.weekday}曜・{periodLabel(course.period, account?.university)}{course.room ? `　${course.room}` : ""}</span>
                    </span>
                    <span className="text-slate-300" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-slate-700">まだ授業が登録されていません</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">時間割の「＋ 追加」から登録するか、履修タブで授業を探して追加できます。</p>
            {hasAnyCourses > 0 && <p className="mt-2 text-xs text-slate-500">時間割は学期ごとに分けて管理されます。別の学期の授業は学期切替から確認できます。</p>}
            <Link href="/simulator" className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">履修を組む</Link>
          </div>
        )}
      </section>

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
