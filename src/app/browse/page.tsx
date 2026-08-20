"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, StarRating } from "@/components/ui";
import { UNIVERSITIES, universitySupportsSyllabusSync } from "@/lib/universities";
import { periodLabel } from "@/lib/periods";

// サインアップ前でも「アプリの中身」を確認できるようにする読み取り専用プレビュー画面。
// 実データレビューで、直接競合のPenmarkはサインアップ不要で使い始められる一方、
// 本アプリは全機能がログイン必須で、特に既存ユーザーの口コミが無い新規展開キャンパスでは
// 離脱の摩擦になりやすいと判明したための対応。個人を特定する自由記述コメントは含めず、
// 授業名・教員・時間割・匿名集計評価（平均・件数）のみを見せる。

interface CoursePreview {
  id: string;
  name: string;
  teacher: string | null;
  weekday: string | null;
  period: number | null;
  overall: number | null;
  karteCount: number;
}

export default function BrowsePage() {
  const syncedUniversities = UNIVERSITIES.filter((u) => universitySupportsSyllabusSync(u.id));
  const [university, setUniversity] = useState(syncedUniversities[0]?.id ?? "miyazaki-u");
  const [q, setQ] = useState("");
  const [courses, setCourses] = useState<CoursePreview[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (q.trim().length < 1) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), university, semester: "後期" });
      const res = await fetch(`/api/syllabus/search?${params.toString()}`);
      const data = await res.json();
      setCourses(data.courses ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="授業を探してみる" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        登録前でも、授業名・教員・時間割とみんなの評価（匿名集計）を確認できます。個別のコメントを読んだり、自分の時間割を作るには登録が必要です。
      </p>

      <div className="flex gap-2 mb-2 overflow-x-auto">
        {syncedUniversities.map((u) => (
          <button
            key={u.id}
            onClick={() => setUniversity(u.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              university === u.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {u.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="授業名で検索（例：微分積分）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white text-sm px-4"
        >
          検索
        </button>
      </div>

      {courses === null && (
        <p className="text-sm text-gray-400 text-center py-10">
          大学を選んで授業名を検索してください。
        </p>
      )}
      {courses !== null && courses.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">見つかりませんでした。</p>
      )}

      <div className="space-y-2">
        {courses?.map((c) => (
          <Card key={c.id}>
            <h3 className="text-sm font-bold">{c.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {c.weekday && c.period && `${c.weekday}・${periodLabel(c.period, university)}`}
              {c.teacher && ` ・担当：${c.teacher}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={c.overall} />
              <span className="text-xs text-gray-400">{c.karteCount}件の評価</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 mb-3">
          コメントを読んだり、自分の時間割・授業カルテを記録するには登録が必要です。
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-xl bg-blue-600 text-white text-sm font-bold px-6 py-2.5"
        >
          無料で登録する
        </Link>
      </div>
    </main>
  );
}
