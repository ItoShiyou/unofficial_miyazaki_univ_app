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
  rsvped: boolean;
  checkedIn: boolean;
  feedbackGiven: boolean;
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

  function rsvp(id: string) {
    fetch(`/api/sponsors/${id}/rsvp`, { method: "POST" })
      .then((res) => {
        if (!res.ok) return;
        setUpcomingEvents((prev) => prev.map((s) => (s.id === id ? { ...s, rsvped: true } : s)));
      })
      .catch(() => {});
  }

  function cancelRsvp(id: string) {
    fetch(`/api/sponsors/${id}/rsvp`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) return;
        setUpcomingEvents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, rsvped: false, checkedIn: false } : s))
        );
      })
      .catch(() => {});
  }

  function checkIn(id: string) {
    fetch(`/api/sponsors/${id}/checkin`, { method: "POST" })
      .then((res) => {
        if (!res.ok) return;
        setUpcomingEvents((prev) => prev.map((s) => (s.id === id ? { ...s, checkedIn: true } : s)));
      })
      .catch(() => {});
  }

  const [pastEvents, setPastEvents] = useState<Sponsor[]>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, number>>({});

  function submitFeedback(id: string) {
    const rating = feedbackDrafts[id];
    if (!rating) return;
    fetch(`/api/sponsors/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    })
      .then((res) => {
        if (!res.ok) return;
        setPastEvents((prev) => prev.map((s) => (s.id === id ? { ...s, feedbackGiven: true } : s)));
      })
      .catch(() => {});
  }

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
        setPastEvents(
          all
            .filter(
              (s) =>
                s.eventLabel &&
                s.eventAt &&
                new Date(s.eventAt).getTime() <= now &&
                s.checkedIn &&
                !s.feedbackGiven
            )
            .sort((a, b) => new Date(b.eventAt!).getTime() - new Date(a.eventAt!).getTime())
        );
      })
      .catch(() => setSponsors([]));

    // チラシ・ポスターのQRコードから /sponsors?qr=<id> で来た場合、流入を計測する。
    const qrId = new URLSearchParams(window.location.search).get("qr");
    if (qrId) {
      fetch(`/api/sponsors/${qrId}/qr-scan`, { method: "POST" }).catch(() => {});
    }
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
                {account ? (
                  s.checkedIn ? (
                    <p className="text-[11px] text-emerald-600 mt-2">✓ 来場済みとして記録しました</p>
                  ) : s.rsvped ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-violet-600">申込済み</span>
                      <button
                        onClick={() => checkIn(s.id)}
                        className="text-[11px] font-medium text-white bg-violet-600 rounded-full px-2.5 py-1"
                      >
                        来場しました
                      </button>
                      <button onClick={() => cancelRsvp(s.id)} className="text-[11px] text-gray-400">
                        申込を取消す
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => rsvp(s.id)}
                      className="text-[11px] font-medium text-violet-700 bg-white border border-violet-300 rounded-full px-2.5 py-1 mt-2"
                    >
                      参加する
                    </button>
                  )
                ) : (
                  <p className="text-[11px] text-gray-400 mt-2">参加申込にはログインが必要です</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-medium mb-2 px-0.5">来場したイベントの感想</p>
          <div className="space-y-2">
            {pastEvents.map((s) => (
              <div key={s.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-bold">{s.eventLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.name}</p>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackDrafts((prev) => ({ ...prev, [s.id]: n }))}
                      className={`text-lg ${
                        (feedbackDrafts[s.id] ?? 0) >= n ? "text-amber-500" : "text-gray-300"
                      }`}
                      aria-label={`${n}点`}
                    >
                      ★
                    </button>
                  ))}
                  <button
                    onClick={() => submitFeedback(s.id)}
                    disabled={!feedbackDrafts[s.id]}
                    className="ml-2 text-[11px] font-medium text-white bg-amber-600 rounded-full px-2.5 py-1 disabled:opacity-40"
                  >
                    送信
                  </button>
                </div>
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
