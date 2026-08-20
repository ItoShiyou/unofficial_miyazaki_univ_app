"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSenseの広告ユニット。
 * layout.tsxで読み込んでいるadsbygoogle.jsは広告の配信基盤を有効化するだけで、
 * 実際に広告を表示するにはページ側でこの<ins>タグを配置する必要がある。
 * slotが未設定（AdSense管理画面でまだ広告ユニットを作成していない）の間は何も表示しない。
 */
export default function AdUnit({ slot }: { slot?: string }) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 広告ブロッカー等で失敗しても、アプリ本体の動作には影響させない
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle block"
      style={{ display: "block" }}
      data-ad-client="ca-pub-7288550090197475"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
