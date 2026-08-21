"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentSemester } from "@/lib/useSemester";
import { periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";
import { StarRating } from "@/components/ui";
import KarteFormModal from "@/components/KarteFormModal";
import { universityName } from "@/lib/universities";

interface Karte {
  id: string;
  attendanceMethod: string | null;
  attendanceStrictness: number | null;
  assignmentVolume: number | null;
  examFormat: string | null;
  examDifficulty: number | null;
  clarity: number | null;
  overallEasiness: number | null;
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
  university: string;
}

interface Data {
  // 存在しないsyllabusCourseIdを指定した場合、APIは404ではなく
  // course: null を含む200を返す仕様のため、nullを許容する必要がある。
  course: SyllabusCourse | null;
  kartes: Karte[];
  summary: {
    count: number;
    attendanceStrictness: number | null;
    assignmentVolume: number | null;
    examDifficulty: number | null;
    clarity: number | null;
    overallEasiness: number | null;
  };
  overall: number | null;
  freeTextHidden: boolean;
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
  const [loadError, setLoadError] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [reportMenuFor, setReportMenuFor] = useState<string | null>(null);
  const semester = useCurrentSemester();
  const account = useAccount();

  const load = useCallback(() => {
    fetch(`/api/karte?syllabusCourseId=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed to load");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <main className="flex-1 pb-6 px-4 pt-8 text-center">
        <p className="text-sm text-gray-500 mb-3">読み込みに失敗しました。</p>
        <button onClick={load} className="text-sm text-blue-600">
          再読み込み
        </button>
      </main>
    );
  }

  if (!data) return null;
  const { course, kartes, summary, overall } = data;

  // 存在しないsyllabusCourseId（削除済み・不正なURL等）の場合、APIは
  // course: null を含む200を返す。ここでnullチェックをしないと
  // 直後のcourse.nameアクセスで実行時エラーになってしまう。
  if (!course) {
    return (
      <main className="flex-1 pb-6 px-4 pt-8 text-center">
        <p className="text-sm text-gray-500 mb-3">この授業が見つかりませんでした。</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600">
          戻る
        </button>
      </main>
    );
  }

  const latest = kartes[0];

  return (
    <main className="flex-1 pb-6">
      <div className="flex items-center gap-3 px-4 pt-4 mb-1">
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-lg"
          aria-label="戻る"
        >
          ‹
        </button>
        <span className="text-sm text-gray-400">授業カルテ</span>
      </div>

      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {course.room ?? ""} {course.weekday && course.period && `・${course.weekday}${periodLabel(course.period, account?.university)}`}
          {course.teacher && ` ・担当：${course.teacher}`}
        </p>
        <p className="text-[10px] text-gray-300 mt-1">
          出典：{universityName(course.university)}公式シラバス
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
            <RatingRow label="総合的な楽単度（単位の取りやすさ）" value={summary.overallEasiness} />
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
                <p className="text-sm">
                  {data.freeTextHidden
                    ? "投稿件数が少なく個人が特定されるおそれがあるため、非表示にしています"
                    : latest.advice || "情報なし"}
                </p>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "voices" && (
        <section className="px-4 space-y-2">
          {data.freeTextHidden && (
            <p className="text-sm text-gray-400">
              投稿件数が少なく個人が特定されるおそれがあるため、感想欄は非表示にしています。
            </p>
          )}
          {!data.freeTextHidden && kartes.filter((k) => k.comment).length === 0 && (
            <p className="text-sm text-gray-400">まだ感想の投稿がありません。</p>
          )}
          {kartes
            .filter((k) => k.comment)
            .map((k) => (
              <div key={k.id} className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm whitespace-pre-wrap">{k.comment}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-300">
                    {new Date(k.createdAt).toLocaleDateString("ja-JP")}・匿名
                  </p>
                  {!reported.has(k.id) && reportMenuFor !== k.id && (
                    <button
                      onClick={() => setReportMenuFor(k.id)}
                      className="text-[10px] text-gray-300"
                    >
                      不適切な内容を報告
                    </button>
                  )}
                  {reported.has(k.id) && (
                    <span className="text-[10px] text-gray-300">通報済み</span>
                  )}
                  {!reported.has(k.id) && reportMenuFor === k.id && (
                    <div className="flex items-center gap-1.5">
                      {[
                        { value: "defamation", label: "誹謗中傷" },
                        { value: "harassment", label: "嫌がらせ" },
                        { value: "spam", label: "スパム" },
                        { value: "other", label: "その他" },
                      ].map((r) => (
                        <button
                          key={r.value}
                          onClick={() => {
                            setReportMenuFor(null);
                            fetch(`/api/karte/${k.id}/report`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ reason: r.value }),
                            })
                              .then((res) => {
                                if (!res.ok) throw new Error("failed");
                                setReported((prev) => new Set(prev).add(k.id));
                              })
                              .catch(() => alert("通報に失敗しました。時間をおいて再度お試しください。"));
                          }}
                          className="text-[10px] text-gray-400 bg-gray-50 rounded-full px-1.5 py-0.5"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
          existingCount={data?.summary.count ?? 0}
          onClose={() => setPosting(false)}
          onSaved={load}
        />
      )}
    </main>
  );
}
