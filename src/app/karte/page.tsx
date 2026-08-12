"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { PageHeader, StarRating } from "@/components/ui";

interface SyllabusCourse {
  id: string;
  name: string;
  teacher: string | null;
  room: string | null;
  weekday: string | null;
  period: number | null;
  overall: number | null;
}

export default function KartePage() {
  const semester = useCurrentSemester();
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<SyllabusCourse[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let ignore = false;
    const t = setTimeout(() => {
      fetch(
        `/api/syllabus/search?q=${encodeURIComponent(query)}&year=${semester.year}&semester=${semester.semester}`
      )
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
  }, [query, semester]);

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

      <div className="px-4 space-y-2">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/karte/${c.id}`}
            className="block rounded-2xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <StarRating value={c.overall} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {c.teacher} {c.room && `・${c.room}`} {c.weekday && `・${c.weekday}${c.period}限`}
            </p>
          </Link>
        ))}
        {searched && courses.length === 0 && (
          <p className="text-sm text-gray-400 mt-6 text-center">
            該当する授業が見つかりません。
          </p>
        )}
      </div>
    </main>
  );
}
