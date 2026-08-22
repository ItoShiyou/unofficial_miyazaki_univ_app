"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

export async function getPushSubscriptionState(): Promise<"subscribed" | "unsubscribed" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

export type SubscribeResult = "ok" | "denied" | "dismissed" | "failed";

// 実データレビュー：コードレビューで、通知許可を拒否した場合とダイアログを
// 閉じただけの場合を区別せず同じエラー文言を出しており、「denied」の場合は
// 多くのブラウザでボタンを再度押してもダイアログ自体が出ずブラウザの
// サイト設定から手動変更が必要という違いが伝わらないことが判明した（サイクル210）。
// 呼び出し元がこの2状態を出し分けられるよう、真偽値ではなく結果種別を返す。
/** 通知の許可を求め、購読してサーバーへ登録する。ユーザーの明示的な操作から呼ぶこと。 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!pushSupported()) return "failed";
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "dismissed";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok ? "ok" : "failed";
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}

/** 特定の授業の変更を通知してほしいという意思表示。購読自体が無効なら何もしない。 */
export async function watchCourse(syllabusCourseId: string): Promise<void> {
  const state = await getPushSubscriptionState();
  if (state !== "subscribed") return;
  await fetch("/api/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syllabusCourseId }),
  }).catch(() => {});
}

export async function unwatchCourse(syllabusCourseId: string): Promise<void> {
  await fetch("/api/watch", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syllabusCourseId }),
  }).catch(() => {});
}
