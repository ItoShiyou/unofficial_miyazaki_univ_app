"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { useAccount } from "@/lib/useAccount";

type Sponsor = {
  id: string;
  name: string;
  category: string;
  description: string;
  offer: string | null;
  url: string | null;
  area: string | null;
  hasCoupon: boolean;
  eventLabel: string | null;
  eventAt: string | null;
};

export default function SponsorsPage() {
  const account = useAccount();
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [stampedIds, setStampedIds] = useState<Set<string>>(new Set());

  const revealCode = (id: string) => {
    fetch(`/api/sponsors/${id}/reveal-code`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.couponCode) {
          setRevealedCodes((prev) => ({ ...prev, [id]: data.couponCode }));
        }
        if (data.stampCollected) {
          setStampedIds((prev) => new Set(prev).add(id));
        }
      })
      .catch(() => {});
  };

  const [upcomingEvents, setUpcomingEvents] = useState<Sponsor[]>([]);

  useEffect(() => {
    fetch("/api/sponsors")
      .then((res) => res.json())
      .then((data) => {
        const all: Sponsor[] = data.sponsors ?? [];
        setSponsors(all);
        // イベント一覧は取得時点（副作用）で計算する。renderの中で
        // Date.now()を呼ぶとReact Compilerの純粋性チェックに引っかかるため。
        const now = Date.now();
        setUpcomingEvents(
          all
            .filter((s) => s.eventLabel && s.eventAt && new Date(s.eventAt).getTime() > now)
            .sort((a, b) => new Date(a.eventAt!).getTime() - new Date(b.eventAt!).getTime())
        );
      })
      .catch(() => setSponsors([]));
  }, []);

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="地元とつながる" />
      <p className="text-sm text-gray-500 px-0.5 pb-2">
        宮大非公式アプリは、学生からは一切課金していません。ここに並ぶ宮崎県内のお店・企業からの協賛が、アプリの運営を支えています。
      </p>
      {account && (
        <p className="px-0.5 pb-4">
          <Link href="/stamps" className="text-xs text-blue-600">
            集めた地元スタンプを見る →
          </Link>
        </p>
      )}

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

      {upcomingEvents.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-medium mb-2 px-0.5">今度のイベント</p>
          <p className="text-xs text-gray-400 mb-2 px-0.5">
            宮崎県内のどの大学の学生でも参加できます。大学の垣根を越えて集まる場です。
          </p>
          <div className="space-y-2">
            {upcomingEvents.map((s) => (
              <div key={s.id} className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs text-violet-500 font-medium">
                  {new Date(s.eventAt!).toLocaleString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm font-bold mt-0.5">{s.eventLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.name}
                  {s.area ? ` ・ ${s.area}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
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
            {s.hasCoupon && (
              revealedCodes[s.id] ? (
                <div className="mt-2">
                  <p className="text-xs font-mono font-bold text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5 inline-block">
                    コード: {revealedCodes[s.id]}
                  </p>
                  {stampedIds.has(s.id) && (
                    <p className="text-[11px] text-emerald-600 mt-1">🏷️ 地元スタンプを1つ獲得しました</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => revealCode(s.id)}
                  className="block text-xs font-medium text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5 mt-2"
                >
                  🎟️ クーポンコードを見る
                </button>
              )
            )}
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  fetch(`/api/sponsors/${s.id}/click`, { method: "POST" }).catch(() => {});
                }}
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
