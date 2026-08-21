"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCurrentSemester } from "@/lib/useSemester";
import { useAccount } from "@/lib/useAccount";
import { universitySupportsSyllabusSync } from "@/lib/universities";
import { PageHeader, Card } from "@/components/ui";

// 新入生がもっとも情報を求めるのは入学直後の2週間。既存の機能を束ねた
// チェックリストとして案内することで、入学期という限られた時間帯だけの
// 体験を作る。学年を問わない汎用UIしか持たない全国区の競合には無い導線。
interface Step {
  key: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  done: boolean;
}

export default function OnboardingPage() {
  const account = useAccount();
  const semester = useCurrentSemester();
  const [isStandalone] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(display-mode: standalone)").matches
  );
  const [friendCount, setFriendCount] = useState<number | null>(null);

  const courses =
    useLiveQuery(
      () =>
        db.courses.where("[year+semester]").equals([semester.year, semester.semester]).toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore) setFriendCount(d?.friends?.length ?? 0);
      })
      .catch(() => {
        if (!ignore) setFriendCount(null);
      });
    return () => {
      ignore = true;
    };
  }, [account]);

  if (!account) return null;

  const syllabusSupported = universitySupportsSyllabusSync(account.university);

  const steps: Step[] = [
    {
      key: "install",
      title: "ホーム画面に追加する",
      description: "毎回ブラウザで検索しなくて済むように、アプリとしてホーム画面に置いておきましょう。",
      href: "/install",
      linkLabel: "追加方法を見る",
      done: isStandalone,
    },
    {
      key: "timetable",
      title: "時間割を登録する",
      description: syllabusSupported
        ? "シラバスから検索して登録すると、授業カルテや変更通知とも自動でつながります。"
        : "この大学はまだシラバス自動連携に対応していないため、手動で登録してください。",
      href: "/timetable",
      linkLabel: "時間割ページを開く",
      done: courses.length > 0,
    },
    {
      key: "karte",
      title: "先輩の授業カルテを覗いてみる",
      description: "出席の厳しさ・課題量など、シラバスには載らない一次情報を確認できます。",
      href: "/karte",
      linkLabel: "授業カルテを見る",
      done: courses.some((c) => !!c.syllabusCourseId),
    },
    {
      key: "sponsors",
      title: "地元とつながる特典をチェックする",
      description: "宮崎県内の協賛店舗・企業の学生特典を確認できます。",
      href: "/sponsors",
      linkLabel: "協賛企業一覧を見る",
      done: false,
    },
    {
      key: "friends",
      title: "友達を招待する",
      description: "招待コードでつながると、空きコマが同じ友達を見つけやすくなります。",
      href: "/friends",
      linkLabel: "友達ページを開く",
      done: (friendCount ?? 0) > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <main className="flex-1 pb-8">
      <PageHeader title="はじめの2週間ガイド" />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        入学・進級直後にやっておくと後で楽になることをまとめました（{doneCount}/{steps.length}完了）。
      </p>

      <div className="px-4 mb-5">
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {steps.map((s, i) => (
          <Card key={s.key} className={s.done ? "opacity-60" : ""}>
            <div className="flex items-start gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 ${
                  s.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                {!s.done && (
                  <Link href={s.href} className="inline-block text-xs text-blue-600 mt-2">
                    {s.linkLabel} →
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {doneCount === steps.length && (
        <p className="px-4 mt-6 text-sm text-emerald-600 text-center">
          お疲れさまでした。あとはいつも通り使うだけです。
        </p>
      )}
    </main>
  );
}
