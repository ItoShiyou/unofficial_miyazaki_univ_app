"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui";

type Sponsor = {
  id: string;
  name: string;
  category: string;
  description: string;
  offer: string | null;
  url: string | null;
  area: string | null;
};

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);

  useEffect(() => {
    fetch("/api/sponsors")
      .then((res) => res.json())
      .then((data) => setSponsors(data.sponsors ?? []))
      .catch(() => setSponsors([]));
  }, []);

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="地元とつながる" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        宮大非公式アプリは、学生からは一切課金していません。ここに並ぶ宮崎県内のお店・企業からの協賛が、アプリの運営を支えています。
      </p>

      {sponsors === null && (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中…</p>
      )}

      {sponsors !== null && sponsors.length === 0 && (
        <Card>
          <p className="text-sm text-gray-500 text-center py-6">
            まだ協賛店舗・企業がありません。
            <br />
            宮崎県内で協賛にご興味のある企業様は、開発者までご連絡ください。
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {sponsors?.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block text-[11px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 mb-1">
                  {s.category}
                  {s.area ? ` ・ ${s.area}` : ""}
                </span>
                <h3 className="text-sm font-bold">{s.name}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">{s.description}</p>
            {s.offer && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 mt-2 inline-block">
                🎁 {s.offer}
              </p>
            )}
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 mt-2"
              >
                詳しく見る →
              </a>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          宮崎県内で学生に向けた情報発信・協賛にご興味のある企業様・店舗様は
          <br />
          開発者までご連絡ください。学生に負担のない形で、地域と学生をつなげます。
        </p>
      </div>
    </main>
  );
}
