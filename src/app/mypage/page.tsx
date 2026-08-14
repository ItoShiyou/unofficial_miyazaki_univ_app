"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { useDisplayName, setDisplayName } from "@/lib/device";
import { exportTimetableCsv, importTimetableCsv } from "@/lib/csv";
import { computeGpa } from "@/lib/gpa";
import { universityName } from "@/lib/universities";
import { PageHeader, Card } from "@/components/ui";

interface SyllabusChangeEntry {
  id: string;
  syllabusCourseId: string | null;
  courseName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
}

const FIELD_LABEL: Record<string, string> = {
  teacher: "担当教員",
  schedule: "曜日・時限",
  removed: "掲載状況",
};

interface SyllabusStatus {
  total: number;
  lastFetchedAt: string | null;
}

interface AccountInfo {
  email: string;
  university: string;
  displayName: string | null;
}

export default function MyPage() {
  const router = useRouter();
  const savedName = useDisplayName();
  const [draftName, setDraftName] = useState(savedName);
  const [editingName, setEditingName] = useState(false);
  const semester = useCurrentSemester();
  const [changes, setChanges] = useState<SyllabusChangeEntry[]>([]);
  const [status, setStatus] = useState<SyllabusStatus | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setAccount(d.user ?? null);
      })
      .catch(() => {
        if (!ignore) setAccount(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    fetch(`/api/syllabus/changes?year=${semester.year}&semester=${semester.semester}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setChanges(d.changes ?? []);
      })
      .catch(() => {
        if (!ignore) setChanges([]);
      });
    fetch(`/api/syllabus/status?year=${semester.year}&semester=${semester.semester}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setStatus(d);
      })
      .catch(() => {
        if (!ignore) setStatus(null);
      });
    return () => {
      ignore = true;
    };
  }, [semester.year, semester.semester]);

  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const currentCourses = courses.filter(
    (c) => c.year === semester.year && c.semester === semester.semester
  );

  const semesterCounts = new Map<string, number>();
  for (const c of courses) {
    const key = `${c.year}年度 ${c.semester}`;
    semesterCounts.set(key, (semesterCounts.get(key) ?? 0) + 1);
  }

  const cumulativeGpa = computeGpa(courses);
  const currentSemesterGpa = computeGpa(currentCourses);

  function saveName() {
    setDisplayName(draftName.trim());
    setEditingName(false);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const result = await importTimetableCsv(text, semester);
    const notes = [
      result.skipped ? `${result.skipped}件は形式不正でスキップ` : "",
      result.conflicted ? `${result.conflicted}件は時間割の重複でスキップ` : "",
    ].filter(Boolean);
    alert(`${result.imported}件の授業を読み込みました。${notes.length ? `（${notes.join(" / ")}）` : ""}`);
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader title="マイページ" />

      <div className="px-4 space-y-4">
        <Card>
          <p className="text-xs text-gray-400 mb-2">アカウント</p>
          {account ? (
            <div className="space-y-1 mb-3">
              <p className="text-sm font-medium">{account.email}</p>
              <p className="text-xs text-gray-500">{universityName(account.university)}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">読み込み中...</p>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs text-red-600 disabled:opacity-50"
          >
            {loggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </Card>

        <Card>
          <p className="text-xs text-gray-400 mb-2">ニックネーム</p>
          {editingName ? (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <button onClick={saveName} className="rounded-lg bg-gray-900 text-white text-sm px-4">
                保存
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{savedName || "未設定"}</span>
              <button
                onClick={() => {
                  setDraftName(savedName);
                  setEditingName(true);
                }}
                className="text-xs text-blue-600"
              >
                編集
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">友達との時間割比較で表示される名前です。</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">友達と比較</span>
            <Link href="/friends" className="text-xs text-blue-600">
              開く →
            </Link>
          </div>
          <p className="text-xs text-gray-400">招待コードで友達を追加し、時間割を比較できます。</p>
        </Card>

        <Card>
          <p className="text-sm font-medium mb-2">学期</p>
          <p className="text-xs text-gray-400 mb-2">現在表示中：{semesterLabel(semester)}（{currentCourses.length}科目）</p>
          <div className="space-y-1">
            {Array.from(semesterCounts.entries()).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-400">{count}科目</span>
              </div>
            ))}
            {semesterCounts.size === 0 && (
              <p className="text-xs text-gray-400">まだ授業が登録されていません。</p>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium mb-2">成績・GPA</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400 mb-1">{semesterLabel(semester)}</p>
              <p className="text-xl font-bold">
                {currentSemesterGpa.gpa != null ? currentSemesterGpa.gpa.toFixed(2) : "―"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400 mb-1">通算</p>
              <p className="text-xl font-bold">
                {cumulativeGpa.gpa != null ? cumulativeGpa.gpa.toFixed(2) : "―"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            成績・単位数が入力済みの科目（{cumulativeGpa.gradedCourseCount}科目・
            {cumulativeGpa.creditsCounted}単位）から算出。各授業の詳細ページで成績を入力できます。
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium mb-2">時間割データ</p>
          <div className="flex gap-2">
            <button
              onClick={() => exportTimetableCsv(currentCourses)}
              className="flex-1 rounded-lg border border-gray-300 text-sm py-2"
            >
              CSVエクスポート
            </button>
            <label className="flex-1 rounded-lg border border-gray-300 text-sm py-2 text-center cursor-pointer">
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
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium mb-1">シラバス連携</p>
          <p className="text-xs text-gray-400 mb-3">
            {semesterLabel(semester)}の全授業を大学の公開シラバスから学期に1回、サーバー側で自動的に取得・保管しています（手動での再取得はできません）。
          </p>
          {status ? (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">保管件数</span>
                <span>{status.total}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">最終更新</span>
                <span>
                  {status.lastFetchedAt
                    ? new Date(status.lastFetchedAt).toLocaleDateString("ja-JP")
                    : "未取得"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">読み込み中...</p>
          )}
        </Card>

        {changes.length > 0 && (
          <Card>
            <p className="text-sm font-medium mb-1">シラバスの変更履歴</p>
            <p className="text-xs text-gray-400 mb-3">
              {semesterLabel(semester)}で検知された変更（新しい順・最大50件）
            </p>
            <ul className="space-y-2">
              {changes.map((c) => {
                const inner = (
                  <>
                    <p className="text-sm font-medium">{c.courseName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.field === "removed" ? (
                        "シラバスから掲載終了になりました"
                      ) : (
                        <>
                          {FIELD_LABEL[c.field] ?? c.field}：{c.oldValue || "（空）"} →{" "}
                          {c.newValue || "（空）"}
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(c.detectedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </>
                );
                return (
                  <li key={c.id} className="rounded-xl border border-gray-200 p-3">
                    {c.syllabusCourseId ? (
                      <Link href={`/karte/${c.syllabusCourseId}`}>{inner}</Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <p className="text-[11px] text-gray-300 text-center pt-2">宮大非公式アプリ（開発版）</p>
      </div>
    </main>
  );
}
