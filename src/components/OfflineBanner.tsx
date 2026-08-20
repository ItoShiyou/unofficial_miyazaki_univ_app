"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("offline", callback);
  window.addEventListener("online", callback);
  return () => {
    window.removeEventListener("offline", callback);
    window.removeEventListener("online", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

// SSR時（Node環境）はwindowが無い。navigator自体はNode18+にも存在するが
// onLineプロパティを持たないため、navigatorの有無ではなくwindowの有無で判定する。
function getServerSnapshot() {
  return false;
}

// 実データレビューで、Service Workerのオフラインキャッシュ自体は網羅的だが、
// キャッシュから表示している間もユーザーに「最新でない可能性がある」ことを示す
// UI上の合図が一切無いという指摘を受けた（シラバス変更・休講・教室変更等、
// 古いままだと実害につながる情報を扱うアプリのため、無言でのフォールバックは避ける）。
// sw.js自体はAPIレスポンスをキャッシュしない設計のため「古いデータを新しいものとして
// 誤表示する」リスクは無いが、オフライン時はAPI呼び出しが単純に失敗するだけになるため、
// 「オフラインである」こと自体を明示するバナーを追加する。
export default function OfflineBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-50 text-amber-800 text-xs text-center py-1.5 px-4">
      オフラインです。シラバスの変更・休講情報などが最新でない可能性があります。
    </div>
  );
}
