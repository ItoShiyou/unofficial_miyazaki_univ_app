"use client";

import { useState } from "react";
import type { SemesterKey } from "@/lib/semester";

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
  onClose,
  onSaved,
}: {
  syllabusCourseId: string;
  semester: SemesterKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [attendanceMethod, setAttendanceMethod] = useState("");
  const [attendanceStrictness, setAttendanceStrictness] = useState(3);
  const [assignmentVolume, setAssignmentVolume] = useState(3);
  const [examFormat, setExamFormat] = useState("");
  const [examDifficulty, setExamDifficulty] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [atmosphere, setAtmosphere] = useState("");
  const [pace, setPace] = useState("");
  const [advice, setAdvice] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/karte", {
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
          atmosphere,
          pace,
          advice,
          comment,
        }),
      });
      onSaved();
      onClose();
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
            />
          </div>
          <RatingSelect label="試験の難易度" value={examDifficulty} onChange={setExamDifficulty} />
          <RatingSelect label="授業の分かりやすさ" value={clarity} onChange={setClarity} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">授業の雰囲気</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={atmosphere}
              onChange={(e) => setAtmosphere(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">授業の進行速度</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">受講生へのアドバイス</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">実際に受けてみてどうだったか</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
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
