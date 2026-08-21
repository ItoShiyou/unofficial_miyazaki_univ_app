"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

interface Stamp {
  id: string;
  collectedAt: string;
  sponsor: {
    id: string;
    name: string;
    category: string;
    area: string | null;
    isActive: boolean;
  };
}

export default function StampsPage() {
  const [stamps, setStamps] = useState<Stamp[] | null>(null);

  useEffect(() => {
    fetch("/api/stamps")
      .then((r) => (r.ok ? r.json() : { stamps: [] }))
      .then((d) => setStamps(d.stamps ?? []))
      .catch(() => setStamps([]));
  }, []);

  const areaCount = new Set(
    (stamps ?? []).map((s) => s.sponsor.area).filter((a): a is string => !!a)
  ).size;

  return (
    <main className="flex-1 pb-8">
      <PageHeader title="地元スタンプ帳" />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        協賛店舗のクーポンコードを開封するたびに、1つずつスタンプが貯まります。
      </p>

      {stamps === null && <p className="px-4 text-sm text-gray-400 text-center py-10">読み込み中…</p>}

      {stamps !== null && stamps.length === 0 && (
        <div className="px-4">
          <Card>
            <p className="text-sm text-gray-500 text-center py-6">
              まだスタンプがありません。
              <br />
              <Link href="/sponsors" className="text-blue-600">
                地元とつながる
              </Link>
              ページでクーポンを開封すると、ここに貯まっていきます。
            </p>
          </Card>
        </div>
      )}

      {stamps !== null && stamps.length > 0 && (
        <>
          <div className="px-4 mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold">{stamps.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">スタンプ</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold">{areaCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">エリア</p>
            </div>
          </div>

          <div className="px-4 grid grid-cols-2 gap-3">
            {stamps.map((s) => (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 text-center ${
                  s.sponsor.isActive ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <span className="text-3xl block mb-1">🏷️</span>
                <p className="text-sm font-bold truncate">{s.sponsor.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {s.sponsor.category}
                  {s.sponsor.area ? ` ・ ${s.sponsor.area}` : ""}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {new Date(s.collectedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
