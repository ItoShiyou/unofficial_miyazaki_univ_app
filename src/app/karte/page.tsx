"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WEEKDAYS } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { PERIODS, periodLabel } from "@/lib/periods";
import { useAccount } from "@/lib/useAccount";
import { PageHeader, StarRating } from "@/components/ui";

interface SyllabusCourse {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  weekday: string | null;
  period: number | null;
  overall: number | null;
  karteCount: number;
}

type SortKey = "name" | "rating" | "count";

const SORT_LABEL: Record<SortKey, string> = {
  name: "名前順",
  rating: "評価が高い順",
  count: "レビューが多い順",
};

export default function KartePage() {
  const semester = useCurrentSemester();
  const account = useAccount();
  const [query, setQuery] = useState("");
  const [weekday, setWeekday] = useState<string>("");
  const [period, setPeriod] = useState<number | "">("");
  const [sort, setSort] = useState<SortKey>("name");
  const [courses, setCourses] = useState<SyllabusCourse[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    const t = setTimeout(() => {
      const params = new URLSearchParams({
        year: String(semester.year),
        semester: semester.semester,
        university: account.university,
      });
      if (query.trim()) params.set("q", query.trim());
      if (weekday) params.set("weekday", weekday);
      if (period) params.set("period", String(period));
      fetch(`/api/syllabus/search?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          if (ignore) return;
          setCourses(d.courses ?? []);
          setSearched(true);
        });
    }, 200);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [query, semester, account, weekday, period]);

  const sortedCourses = useMemo(() => {
    const arr = [...courses];
    if (sort === "rating") {
      arr.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
    } else if (sort === "count") {
      arr.sort((a, b) => b.karteCount - a.karteCount);
    }
    return arr;
  }, [courses, sort]);

  const filtersActive = weekday !== "" || period !== "";

  return (
    <main className="flex-1 pb-4">
      <PageHeader title="授業カルテ" />
      <p className="px-4 text-xs text-gray-400 -mt-2 mb-3">{semesterLabel(semester)}</p>

      <div className="px-4 mb-3">
        <input
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
          placeholder="授業名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="px-4 mb-2 flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setWeekday("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
            weekday === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          曜日: すべて
        </button>
        {WEEKDAYS.slice(0, 6).map((w) => (
          <button
            key={w}
            onClick={() => setWeekday(weekday === w ? "" : w)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
              weekday === w ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setPeriod("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
            period === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          時限: すべて
        </button>
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(period === p ? "" : p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
              period === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {p}限
          </button>
        ))}
      </div>

      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {filtersActive ? `${sortedCourses.length}件 該当` : `${sortedCourses.length}件`}
        </span>
        <select
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-transparent"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABEL[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 space-y-2">
        {sortedCourses.map((c) => (
          <Link
            key={c.id}
            href={`/karte/${c.id}`}
            className="block rounded-2xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <StarRating value={c.overall} />
                {c.karteCount > 0 && (
                  <span className="text-[10px] text-gray-400">({c.karteCount})</span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {c.teacher} {c.room && `・${c.room}`} {c.weekday && c.period && `・${c.weekday}${periodLabel(c.period, account?.university)}`}
            </p>
          </Link>
        ))}
        {searched && sortedCourses.length === 0 && (
          <p className="text-sm text-gray-400 mt-6 text-center">
            該当する授業が見つかりません。
          </p>
        )}
      </div>
    </main>
  );
}
