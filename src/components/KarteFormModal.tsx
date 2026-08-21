"use client";

import { useState } from "react";
import type { SemesterKey } from "@/lib/semester";

// サーバー側（src/app/api/karte/route.ts）の文字数上限と揃える。
// 揃えないと、投稿ボタンを押すまで文字数超過に気づけないUXになってしまう。
const MAX_SHORT = 200;
const MAX_LONG = 2000;

function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-full text-xs font-medium ${
              n <= value ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KarteFormModal({
  syllabusCourseId,
  semester,
  existingCount = 0,
  onClose,
  onSaved,
}: {
  syllabusCourseId: string;
  semester: SemesterKey;
  existingCount?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [attendanceMethod, setAttendanceMethod] = useState("");
  const [attendanceStrictness, setAttendanceStrictness] = useState(3);
  const [assignmentVolume, setAssignmentVolume] = useState(3);
  const [examFormat, setExamFormat] = useState("");
  const [examDifficulty, setExamDifficulty] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [overallEasiness, setOverallEasiness] = useState(3);
  const [atmosphere, setAtmosphere] = useState("");
  const [pace, setPace] = useState("");
  const [advice, setAdvice] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusCourseId,
          year: semester.year,
          semester: semester.semester,
          attendanceMethod,
          attendanceStrictness,
          assignmentVolume,
          examFormat,
          examDifficulty,
          clarity,
          overallEasiness,
          atmosphere,
          pace,
          advice,
          comment,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "投稿に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1">授業カルテを投稿</h2>
        <p className="text-xs text-gray-400 mb-4">投稿は匿名で公開されます。</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">出席確認方法</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例: 毎回リアクションペーパー"
              value={attendanceMethod}
              onChange={(e) => setAttendanceMethod(e.target.value)}
              maxLength={MAX_SHORT}
            />
          </div>

          <RatingSelect label="出席の厳しさ" value={attendanceStrictness} onChange={setAttendanceStrictness} />
          <RatingSelect label="課題の多さ" value={assignmentVolume} onChange={setAssignmentVolume} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">試験形式</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例: 期末試験（記述式）"
              value={examFormat}
              onChange={(e) => setExamFormat(e.target.value)}
              maxLength={MAX_SHORT}
            />
          </div>
          <RatingSelect label="試験の難易度" value={examDifficulty} onChange={setExamDifficulty} />
          <RatingSelect label="授業の分かりやすさ" value={clarity} onChange={setClarity} />
          <RatingSelect label="総合的な楽単度（単位の取りやすさ）" value={overallEasiness} onChange={setOverallEasiness} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">授業の雰囲気</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={atmosphere}
              onChange={(e) => setAtmosphere(e.target.value)}
              maxLength={MAX_SHORT}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">授業の進行速度</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              maxLength={MAX_SHORT}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">受講生へのアドバイス</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              maxLength={MAX_LONG}
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">
              {advice.length} / {MAX_LONG}
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">実際に受けてみてどうだったか</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_LONG}
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">
              {comment.length} / {MAX_LONG}
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          教員個人の外見・人格ではなく、授業の内容についてご記入ください。
        </p>
        {existingCount < 4 && (
          <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
            この授業はまだ投稿が少ないため、時期・エピソード等の具体的すぎる記述は避け、投稿者が特定されないようご配慮ください。
          </p>
        )}

        <div className="mt-2 flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </div>
    </div>
  );
}
