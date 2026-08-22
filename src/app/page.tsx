"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db, WEEKDAYS } from "@/lib/db";
import { addDaysLocalDate, todayLocalDate } from "@/lib/date";
import { periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";
import { PageHeader, IconChip, Icon, type Tone, type IconName } from "@/components/ui";
import AdUnit from "@/components/AdUnit";

// IA見直し（ユーザー要望）：友達と比較・今学期の負荷・はじめの2週間ガイド・
// 地元とつながる・求人説明会は、以前はマイページの奥までタップしないと
// 辿り着けなかった。「ホーム画面からもっといろんなところに飛べるといい」
// という指摘を受け、利用頻度の高いこれらの機能をホーム最上部の
// ショートカットとして昇格させた（マイページからは重複カードを削除）。
const SHORTCUTS: { href: string; label: string; icon: IconName; tone: Tone }[] = [
  { href: "/onboarding", label: "はじめの2週間", icon: "checklist", tone: "blue" },
  { href: "/friends", label: "友達と比較", icon: "users", tone: "violet" },
  { href: "/workload", label: "今学期の負荷", icon: "chart", tone: "rose" },
  { href: "/sponsors", label: "地元とつながる", icon: "coin", tone: "emerald" },
  { href: "/jobs", label: "求人・説明会", icon: "briefcase", tone: "cyan" },
];

function todayWeekday() {
  const map = [6, 0, 1, 2, 3, 4, 5];
  return WEEKDAYS[map[new Date().getDay()]];
}

export default function Home() {
  const account = useAccount();
  const today = todayWeekday();
  const todayStr = todayLocalDate();
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const attendances = useLiveQuery(() => db.attendances.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const tasks = allTasks.filter((t) => !t.done);
  const allExams = useLiveQuery(() => db.examSlots.toArray(), []) ?? [];

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const todayCourses = courses
    .filter((c) => c.weekday === today)
    .sort((a, b) => a.period - b.period);

  const todayExams = allExams
    .filter((e) => e.date === todayStr)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const warnings = courses
    .map((c) => {
      const count = attendances.filter(
        (a) => a.courseId === c.id && a.status === "absent"
      ).length;
      return { course: c, remaining: c.absenceLimit - count };
    })
    .filter((w) => w.remaining <= 2);

  const dueTasks = tasks
    .filter((t) => !t.dueDate || t.dueDate <= todayStr)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const upcomingLimit = addDaysLocalDate(7);
  const upcomingTasks = tasks
    .filter((t) => t.dueDate && t.dueDate > todayStr && t.dueDate <= upcomingLimit)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const previews = courses
    .map((c) => {
      const latest = notes
        .filter((n) => n.courseId === c.id && n.nextPreview)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      return latest ? { course: c, note: latest } : null;
    })
    .filter((v): v is NonNullable<typeof v> => !!v);

  async function toggleTask(id: string) {
    await db.tasks.update(id, { done: true });
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader
        title="今日やること"
      />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
      </p>

      <section className="px-4 mb-5">
        <div className="grid grid-cols-5 gap-1.5">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} className="flex flex-col items-center gap-1.5">
              <IconChip tone={s.tone}>
                <Icon name={s.icon} />
              </IconChip>
              <span className="text-[10px] text-gray-500 text-center leading-tight">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 mb-5">
        <h2 className="text-sm font-medium text-gray-500 mb-2">今日の予定</h2>
        {todayCourses.length === 0 && todayExams.length === 0 && (
          <p className="text-sm text-gray-400">今日の授業・試験はありません。</p>
        )}
        <ul className="space-y-1.5">
          {todayExams.map((e) => (
            <li key={e.id}>
              <Link
                href="/exams"
                className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                  試験：{e.title}
                  {e.startTime && `（${e.startTime}〜）`}
                </span>
                {e.room && <span className="text-xs text-amber-700">{e.room}</span>}
              </Link>
            </li>
          ))}
          {todayCourses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.textColor }}
                  />
                  {periodLabel(c.period, account?.university)}：{c.name}
                </span>
                {c.room && <span className="text-xs text-gray-400">{c.room}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(dueTasks.length > 0 || warnings.length > 0) && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-500">やること</h2>
            <Link href="/tasks" className="text-xs text-blue-600">
              課題を全部見る
            </Link>
          </div>
          <ul className="space-y-1.5">
            {dueTasks.map((t) => {
              const course = courseMap.get(t.courseId);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                    <span className="text-sm">
                      {course?.name}：{t.title}
                    </span>
                  </button>
                  {t.dueDate && (
                    <span
                      className={`text-xs ${
                        t.dueDate < todayStr ? "text-red-500 font-medium" : "text-gray-400"
                      }`}
                    >
                      {t.dueDate === todayStr ? "今日まで" : t.dueDate}
                    </span>
                  )}
                </li>
              );
            })}
            {warnings.map(({ course, remaining }) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5"
                >
                  <span className="text-sm">
                    {course.name}：あと{Math.max(remaining, 0)}回欠席可能
                  </span>
                  <span className="text-xs text-red-500 font-medium">
                    {remaining <= 0 ? "上限到達" : "上限まで注意"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcomingTasks.length > 0 && (
        <section className="px-4 mb-5">
          <h2 className="text-sm font-medium text-gray-500 mb-2">もうすぐの課題（7日以内）</h2>
          <ul className="space-y-1.5">
            {upcomingTasks.map((t) => {
              const course = courseMap.get(t.courseId);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <span className="text-sm">
                    {course?.name}：{t.title}
                  </span>
                  <span className="text-xs text-gray-400">{t.dueDate}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {previews.length > 0 && (
        <section className="px-4 mb-5">
          <h2 className="text-sm font-medium text-gray-500 mb-2">メモ・次回予告</h2>
          <ul className="space-y-1.5">
            {previews.map(({ course, note }) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="block rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium">{course.name}</span>
                  <span className="block text-gray-500 text-xs mt-0.5">
                    次回：{note.nextPreview}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length === 0 && (
        <p className="text-sm text-gray-400 mt-8 text-center px-4">
          まだ授業が登録されていません。
          <br />
          <Link href="/timetable" className="text-blue-600">
            時間割ページ
          </Link>
          から授業を追加しましょう。
        </p>
      )}

      <div className="px-4 mt-6">
        <AdUnit slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />
      </div>
    </main>
  );
}
