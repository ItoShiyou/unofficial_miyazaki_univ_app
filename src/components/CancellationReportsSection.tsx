"use client";

import { useEffect, useState } from "react";
import type { Course } from "@/lib/db";

// 「今日休講速報」：学期に1回のシラバス自動同期とは別に、その日限りの
// 「今日この授業は休講かもしれない」という自己申告を学生同士で共有する。
// 詳細な設計意図はsrc/app/api/cancellation-reports/route.tsを参照。
const HIGHLIGHT_THRESHOLD = 2;

export default function CancellationReportsSection({ todaysCourses }: { todaysCourses: Course[] }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reportedByMe, setReportedByMe] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const withSyllabus = todaysCourses.filter((c): c is Course & { syllabusCourseId: string } =>
    Boolean(c.syllabusCourseId)
  );
  const ids = withSyllabus.map((c) => c.syllabusCourseId).join(",");

  useEffect(() => {
    if (!ids) return;
    fetch(`/api/cancellation-reports?syllabusCourseIds=${ids}`)
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts ?? {});
        setReportedByMe(new Set(d.reportedByMe ?? []));
      })
      .catch(() => {});
  }, [ids]);

  if (withSyllabus.length === 0) return null;

  async function report(syllabusCourseId: string) {
    setBusy(syllabusCourseId);
    try {
      const res = await fetch("/api/cancellation-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusCourseId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setCounts((prev) => ({ ...prev, [syllabusCourseId]: data.count }));
        setReportedByMe((prev) => new Set(prev).add(syllabusCourseId));
      }
    } catch {
      // 通信エラーは静かに無視する（任意の軽い機能のため）
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 px-4">
      <h2 className="text-sm font-medium text-gray-500 mb-2">今日の休講速報</h2>
      <div className="space-y-1.5">
        {withSyllabus.map((c) => {
          const count = counts[c.syllabusCourseId] ?? 0;
          const reported = reportedByMe.has(c.syllabusCourseId);
          const highlighted = count >= HIGHLIGHT_THRESHOLD;
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                highlighted ? "border-amber-300 bg-amber-50" : "border-gray-200"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm truncate">{c.name}</p>
                {highlighted && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    休講の可能性があるという報告が{count}件あります
                  </p>
                )}
              </div>
              <button
                onClick={() => report(c.syllabusCourseId)}
                disabled={reported || busy === c.syllabusCourseId}
                className="flex-shrink-0 ml-2 text-xs font-medium rounded-full px-3 py-1.5 disabled:opacity-40 bg-gray-100 text-gray-600"
              >
                {reported ? "報告済み" : "休講かも？"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
