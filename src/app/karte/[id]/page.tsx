"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentSemester } from "@/lib/useSemester";
import { periodLabel } from "@/lib/periods";
import { StarRating } from "@/components/ui";
import KarteFormModal from "@/components/KarteFormModal";

interface Karte {
  id: string;
  attendanceMethod: string | null;
  attendanceStrictness: number | null;
  assignmentVolume: number | null;
  examFormat: string | null;
  examDifficulty: number | null;
  clarity: number | null;
  atmosphere: string | null;
  pace: string | null;
  advice: string | null;
  comment: string | null;
  createdAt: string;
}

interface SyllabusCourse {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  weekday: string | null;
  period: number | null;
  year: number;
  semester: string;
}

interface Data {
  course: SyllabusCourse;
  kartes: Karte[];
  summary: {
    count: number;
    attendanceStrictness: number | null;
    assignmentVolume: number | null;
    examDifficulty: number | null;
    clarity: number | null;
  };
  overall: number | null;
}

function RatingRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <StarRating value={value} />
    </div>
  );
}

export default function KarteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "detail" | "voices">("summary");
  const [data, setData] = useState<Data | null>(null);
  const [posting, setPosting] = useState(false);
  const semester = useCurrentSemester();

  const load = useCallback(() => {
    fetch(`/api/karte?syllabusCourseId=${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;
  const { course, kartes, summary, overall } = data;
  const latest = kartes[0];

  return (
    <main className="flex-1 pb-6">
      <div className="flex items-center gap-3 px-4 pt-4 mb-1">
        <button onClick={() => router.back()} className="text-gray-400 text-lg">
          ‹
        </button>
        <span className="text-sm text-gray-400">授業カルテ</span>
      </div>

      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {course.room ?? ""} {course.weekday && course.period && `・${course.weekday}${periodLabel(course.period)}`}
          {course.teacher && ` ・担当：${course.teacher}`}
        </p>
      </div>

      <div className="px-4 flex gap-2 mb-4">
        {[
          { key: "summary", label: "概要" },
          { key: "detail", label: "詳細" },
          { key: "voices", label: "みんなの声" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === t.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <section className="px-4">
          <div className="rounded-2xl border border-gray-200 p-4 mb-3">
            <p className="text-xs text-gray-400 mb-1">
              みんなの評価（{course.year}年度{course.semester}・{summary.count}件の評価）
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold">{overall ?? "-"}</span>
              <StarRating value={overall} size={18} />
            </div>
            <RatingRow label="出席の厳しさ" value={summary.attendanceStrictness} />
            <RatingRow label="課題の多さ" value={summary.assignmentVolume} />
            <RatingRow label="試験の難易度" value={summary.examDifficulty} />
            <RatingRow label="授業の分かりやすさ" value={summary.clarity} />
          </div>
          {latest && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-2">出席確認方法</p>
              <p className="text-sm">{latest.attendanceMethod || "情報なし"}</p>
            </div>
          )}
        </section>
      )}

      {tab === "detail" && (
        <section className="px-4 space-y-3">
          {!latest && (
            <p className="text-sm text-gray-400">まだ投稿がありません。最初のカルテを投稿しましょう。</p>
          )}
          {latest && (
            <>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium">課題</p>
                <p className="text-sm">{latest.assignmentVolume ? `課題量の目安：★${latest.assignmentVolume}` : "情報なし"}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium">試験</p>
                <p className="text-sm">{latest.examFormat || "情報なし"}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium">授業の特徴</p>
                <p className="text-sm">
                  {[latest.atmosphere, latest.pace].filter(Boolean).join(" ／ ") || "情報なし"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium">受講生のアドバイス</p>
                <p className="text-sm">{latest.advice || "情報なし"}</p>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "voices" && (
        <section className="px-4 space-y-2">
          {kartes.filter((k) => k.comment).length === 0 && (
            <p className="text-sm text-gray-400">まだ感想の投稿がありません。</p>
          )}
          {kartes
            .filter((k) => k.comment)
            .map((k) => (
              <div key={k.id} className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm whitespace-pre-wrap">{k.comment}</p>
                <p className="text-[10px] text-gray-300 mt-2">
                  {new Date(k.createdAt).toLocaleDateString("ja-JP")}・匿名
                </p>
              </div>
            ))}
        </section>
      )}

      <div className="px-4 mt-5">
        <button
          onClick={() => setPosting(true)}
          className="w-full rounded-xl bg-gray-900 text-white text-sm py-3 font-medium"
        >
          自分の感想を投稿
        </button>
      </div>

      {posting && (
        <KarteFormModal
          syllabusCourseId={id}
          semester={{ year: course.year, semester: (course.semester as "前期" | "後期") ?? semester.semester }}
          onClose={() => setPosting(false)}
          onSaved={load}
        />
      )}
    </main>
  );
}
