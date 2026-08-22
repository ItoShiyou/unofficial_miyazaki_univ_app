"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId, COURSE_COLORS, WEEKDAYS, type Weekday } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { PERIODS, periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";

interface SyllabusHit {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  weekday: Weekday | null;
  period: number | null;
}

export default function SimulatorPage() {
  const router = useRouter();
  const semester = useCurrentSemester();
  const account = useAccount();
  const [query, setQuery] = useState("");
  const [rawHits, setRawHits] = useState<SyllabusHit[]>([]);
  const [selected, setSelected] = useState<SyllabusHit | null>(null);
  const [avgVolume, setAvgVolume] = useState<number | null>(null);
  const hits = query.trim() ? rawHits : [];

  const courses =
    useLiveQuery(
      () =>
        db.courses.where("[year+semester]").equals([semester.year, semester.semester]).toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  useEffect(() => {
    if (!query.trim() || !account) return;
    const t = setTimeout(() => {
      fetch(
        `/api/syllabus/search?q=${encodeURIComponent(query)}&year=${semester.year}&semester=${semester.semester}&university=${account.university}`
      )
        .then((r) => r.json())
        .then((d) => setRawHits(d.courses ?? []));
    }, 200);
    return () => clearTimeout(t);
  }, [query, semester, account]);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/karte?syllabusCourseId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => setAvgVolume(d.summary?.assignmentVolume ?? null));
  }, [selected]);

  function findCourse(w: Weekday, p: number) {
    if (selected?.weekday === w && selected?.period === p) return { name: selected.name, preview: true };
    const c = courses.find((c) => c.weekday === w && c.period === p);
    return c ? { name: c.name, preview: false } : null;
  }

  // 実データレビュー：コードレビューで、集中講義・オンデマンド授業等シラバスに
  // 固定の曜日・時限が無い科目（weekday/periodがnull）を選ぶと、重複チェックが
  // 常にfalseになり誤判定するうえ、保存時にはnullがそれぞれ「月」「1限」へ黙って
  // デフォルト割当されることが判明した。既にその枠に別の授業が登録されていても
  // 警告なく保存でき、時間割データが壊れる実害があったため、固定の曜日・時限が
  // 無い科目はこの画面では保存できないようにした（サイクル213）。
  const noFixedSchedule = selected != null && (selected.weekday === null || selected.period === null);

  const conflict =
    selected &&
    !noFixedSchedule &&
    courses.some((c) => c.weekday === selected.weekday && c.period === selected.period);

  const totalSlots = WEEKDAYS.slice(0, 6).length * PERIODS.length;
  const emptySlots = totalSlots - courses.length - (selected && !conflict && !noFixedSchedule ? 1 : 0);

  async function handleSave() {
    if (!selected || conflict || noFixedSchedule || !selected.weekday || !selected.period) return;
    const palette = COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)];
    await db.courses.add({
      id: newId(),
      name: selected.name,
      teacher: selected.teacher ?? undefined,
      room: selected.room ?? undefined,
      weekday: selected.weekday,
      period: selected.period,
      year: semester.year,
      semester: semester.semester,
      absenceLimit: 5,
      color: palette.bg,
      textColor: palette.text,
      syllabusCourseId: selected.id,
      createdAt: Date.now(),
    });
    router.push("/timetable");
  }

  return (
    <main className="flex-1 pb-6">
      <div className="flex items-center justify-between px-4 pt-4 mb-1">
        <h1 className="text-xl font-bold">履修シミュレーション</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-400">
          キャンセル
        </button>
      </div>
      <p className="px-4 text-xs text-gray-400 mb-4">{semesterLabel(semester)}</p>

      <div className="px-4 mb-4">
        <label className="block text-xs text-gray-500 mb-1">追加する授業</label>
        <div className="relative">
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            placeholder="授業名で検索"
            value={selected ? selected.name : query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />
          {hits.length > 0 && !selected && (
            <ul className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => {
                      setSelected(h);
                      setRawHits([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{h.name}</span>
                    <span className="block text-xs text-gray-400">
                      {h.weekday}{h.period && periodLabel(h.period, account?.university)} {h.room && `・${h.room}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="px-4 mb-2">
        <p className="text-xs text-gray-500 mb-2">追加後の時間割（イメージ）</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-5"></th>
              {WEEKDAYS.slice(0, 6).map((w) => (
                <th key={w} className="font-normal text-gray-400 pb-1">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="text-center text-gray-300">{p}</td>
                {WEEKDAYS.slice(0, 6).map((w) => {
                  const cell = findCourse(w, p);
                  return (
                    <td key={w} className="p-0.5">
                      <div
                        className={`h-9 rounded-lg flex items-center justify-center text-center leading-tight px-0.5 ${
                          cell
                            ? cell.preview
                              ? conflict
                                ? "bg-red-100 text-red-600 ring-2 ring-red-400"
                                : "bg-violet-100 text-violet-700 ring-2 ring-violet-400"
                              : "bg-blue-50 text-blue-700"
                            : "bg-gray-50"
                        }`}
                      >
                        {cell?.name}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conflict && (
        <p className="px-4 text-xs text-red-500 mt-1">
          この時間には既に授業が登録されています。時限を変更してください。
        </p>
      )}
      {noFixedSchedule && (
        <p className="px-4 text-xs text-red-500 mt-1">
          この授業は固定の曜日・時限が無いため（集中講義・オンデマンド授業等）、履修シミュレーターでは登録できません。時間割ページから手動で登録してください。
        </p>
      )}

      <div className="px-4 mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">空きコマ数</span>
        <span className="text-sm font-medium">週{Math.max(emptySlots, 0)}コマ</span>
      </div>

      {selected && (
        <div className="px-4 mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">履修負荷（カルテ情報より）</span>
          <span className="text-sm font-medium">
            {avgVolume === null
              ? "情報なし"
              : avgVolume >= 4
              ? "★★★★ (かなり重い)"
              : avgVolume >= 3
              ? "★★★ (やや重い)"
              : "★★ (標準)"}
          </span>
        </div>
      )}

      <div className="px-4 mt-6">
        <button
          onClick={handleSave}
          disabled={!selected || !!conflict || noFixedSchedule}
          className="w-full rounded-xl bg-gray-900 text-white text-sm py-3 font-medium disabled:opacity-40"
        >
          この条件で保存
        </button>
      </div>
    </main>
  );
}
