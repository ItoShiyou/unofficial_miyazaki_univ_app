"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

// 「✕」で閉じた場合の記録。実データレビューで、閉じた状態がReactのstateにしか
// 無くページ再読込・別セッションで再表示され続けてしまう漏れが見つかったため、
// AppSurveyResponseのスキーマ変更（scoreが必須のため「未回答のまま閉じた」を
// 表現できない）は避け、既存パターン（src/lib/device.ts）に倣い端末内に保持する。
const DISMISSED_KEY = "miyadai-survey-dismissed";

// 超軽量ヒアリング（1問アンケート）。「使い続けたいと思いますか？」1問＋任意コメントのみ。
// アカウント作成から3日以上経っていて未回答のユーザーにだけ表示する（判定はサーバー側）。
export default function AppSurveyCard() {
  const [shouldAsk, setShouldAsk] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "1"
  );

  useEffect(() => {
    fetch("/api/survey")
      .then((res) => res.json())
      .then((data) => setShouldAsk(Boolean(data.shouldAsk)))
      .catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  if (!shouldAsk || dismissed) return null;

  function submit() {
    if (!score) return;
    fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment: comment.trim() || undefined }),
    })
      .then((res) => {
        if (res.ok) setSubmitted(true);
      })
      .catch(() => {});
  }

  if (submitted) {
    return (
      <Card>
        <p className="text-sm text-emerald-700">回答ありがとうございました！今後の改善に活かします。</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">このアプリを使い続けたいと思いますか？</p>
        <button
          onClick={dismiss}
          className="text-xs text-gray-400 shrink-0"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`text-xl ${score >= n ? "text-amber-500" : "text-gray-300"}`}
            aria-label={`${n}点`}
          >
            ★
          </button>
        ))}
      </div>
      {score > 0 && (
        <>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="よければ理由も教えてください（任意）"
            className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-xs"
          />
          <button
            onClick={submit}
            className="mt-2 text-xs font-medium text-white bg-blue-600 rounded-full px-3 py-1.5"
          >
            送信する
          </button>
        </>
      )}
    </Card>
  );
}
