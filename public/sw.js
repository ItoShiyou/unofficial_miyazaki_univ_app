// キャッシュ名を変更すると、activate時に古いキャッシュが破棄される。
// 認証導入前のv1はAPIレスポンスまでキャッシュしていたため、v2で必ず作り直す。
const CACHE_NAME = "miyadai-app-v2";

// 事前キャッシュはログイン状態に依存しないものだけに限定する。
// "/" や "/timetable" を事前キャッシュすると、未ログイン時にインストールした場合に
// ログインページのHTMLが "/" として保存され、ログイン後もそれが表示されてしまう。
const APP_SHELL = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 他オリジンへのリクエストには介入しない
  if (url.origin !== self.location.origin) return;

  // APIレスポンスは絶対にキャッシュしない。
  // ログイン中のアカウント情報(/api/auth/me)やシラバス検索結果をキャッシュすると、
  // ログアウト後・アカウント切り替え後に前のユーザーの情報が返ってしまう。
  if (url.pathname.startsWith("/api/")) return;

  // 認証ページはキャッシュしない（ログイン状態によって内容が変わるため）
  if (url.pathname === "/login" || url.pathname === "/signup") return;

  // それ以外はネットワーク優先。オフライン時のみキャッシュを返す。
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // リダイレクト（未ログイン時の /login への転送など）はキャッシュしない
        if (res.ok && res.type === "basic") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(async () => {
        // キャッシュに無い場合(初回アクセスや未キャッシュページ)はundefinedになり、
        // respondWithにResponse以外を渡すとエラーになるためフォールバックを用意する。
        const cached = await caches.match(event.request);
        return cached ?? Response.error();
      })
  );
});

// シラバス変更（教員変更・休講等）のプッシュ通知。
// ペイロードは src/lib/webPush.ts の sendPushToUsers が送る
// {title, body, url} 形式のJSON文字列。
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const { title, body, url } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "宮大非公式アプリ", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/" },
    })
  );
});

// 通知タップで、既に開いているタブがあればそこへフォーカスし、無ければ新規タブを開く。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
