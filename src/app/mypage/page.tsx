"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { useDisplayName, setDisplayName } from "@/lib/device";
import { exportTimetableCsv, importTimetableCsv } from "@/lib/csv";
import { PageHeader, Card } from "@/components/ui";

export default function MyPage() {
  const savedName = useDisplayName();
  const [draftName, setDraftName] = useState(savedName);
  const [editingName, setEditingName] = useState(false);
  const semester = useCurrentSemester();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const currentCourses = courses.filter(
    (c) => c.year === semester.year && c.semester === semester.semester
  );

  const semesterCounts = new Map<string, number>();
  for (const c of courses) {
    const key = `${c.year}年度 ${c.semester}`;
    semesterCounts.set(key, (semesterCounts.get(key) ?? 0) + 1);
  }

  function saveName() {
    setDisplayName(draftName.trim());
    setEditingName(false);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const result = await importTimetableCsv(text, semester);
    alert(`${result.imported}件の授業を読み込みました。${result.skipped ? `(${result.skipped}件はスキップ)` : ""}`);
  }

  async function runSyllabusSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/syllabus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(semester),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error ?? "同期に失敗しました");
        return;
      }
      const parts = [`${data.checked}件を取得`];
      if (data.created) parts.push(`新規${data.created}件`);
      if (data.updated) parts.push(`更新${data.updated}件`);
      if (data.removed) parts.push(`掲載終了${data.removed}件`);
      setSyncResult(parts.join(" / "));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader title="マイページ" />

      <div className="px-4 space-y-4">
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
            {semesterLabel(semester)}の全授業を大学の公開シラバスから取得し、サーバーに保管します。数百〜千件規模のため数十秒かかることがあります。
          </p>
          <button
            onClick={runSyllabusSync}
            disabled={syncing}
            className="w-full rounded-lg border border-gray-300 text-sm py-2 disabled:opacity-50"
          >
            {syncing ? "同期中...（しばらくお待ちください）" : "この学期のシラバスを全件同期"}
          </button>
          {syncResult && <p className="text-xs text-gray-500 mt-2">{syncResult}</p>}
        </Card>

        <p className="text-[11px] text-gray-300 text-center pt-2">宮大非公式アプリ（開発版）</p>
      </div>
    </main>
  );
}
