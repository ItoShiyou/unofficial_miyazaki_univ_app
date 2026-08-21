"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui";

// PWAはApp Store/Google Playに載らないため、既存ユーザーの口コミがまだない
// 新規展開キャンパスでは「そもそもアプリの入手方法が分からない」という
// 発見性の壁が実データレビューで指摘された。QRポスター等の物理的な導線から
// 直接この画面に着地させ、OSごとの「ホーム画面に追加」手順を明示することで
// アプリストアを介さない代替の発見経路をつくる。

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(ua: string): "ios" | "android" | "other" {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export default function InstallPage() {
  const [platform] = useState<"ios" | "android" | "other">(() =>
    typeof navigator === "undefined" ? "other" : detectPlatform(navigator.userAgent)
  );
  const [isStandalone] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(display-mode: standalone)").matches
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <main className="flex-1 flex flex-col px-4 pb-8">
        <PageHeader title="インストール完了" />
        <Card>
          <p className="text-sm text-gray-600 text-center py-6">
            すでにホーム画面から起動しています。準備は完了です。
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="アプリを追加する" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        宮大非公式アプリはApp Store・Google Playには並びません。ブラウザから直接「ホーム画面に追加」するだけで、アプリのように使えるようになります。
      </p>

      {platform === "android" && deferredPrompt && (
        <Card className="mb-3">
          <button
            onClick={handleInstallClick}
            className="w-full rounded-xl bg-blue-600 text-white text-sm font-bold py-3"
          >
            ホーム画面に追加する
          </button>
        </Card>
      )}

      {platform === "ios" && (
        <Card className="mb-3">
          <h2 className="text-sm font-bold mb-2">iPhone / iPadの場合</h2>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>画面下（または上）の「共有」ボタン（□に↑）をタップ</li>
            <li>メニューから「ホーム画面に追加」を選択</li>
            <li>右上の「追加」をタップして完了</li>
          </ol>
          <p className="text-xs text-gray-400 mt-2">
            追加時に「Webアプリとして開く」という選択肢が表示された場合は、オンのままにしてください。オフにするとアプリらしい全画面表示にならず、ブラウザのタブとして開いてしまいます。
          </p>
        </Card>
      )}

      {platform === "android" && !deferredPrompt && (
        <Card className="mb-3">
          <h2 className="text-sm font-bold mb-2">Androidの場合</h2>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>右上のメニュー（縦の三点リーダー）をタップ</li>
            <li>「アプリをインストール」または「ホーム画面に追加」を選択</li>
          </ol>
        </Card>
      )}

      {platform === "other" && (
        <Card className="mb-3">
          <p className="text-sm text-gray-600">
            スマートフォンでこのページを開くと、OSに合わせた追加手順が表示されます。
          </p>
        </Card>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          学生からは一切課金しない、宮崎県内大学生向けの非公式アプリです。
        </p>
      </div>
    </main>
  );
}
