"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ADMAX_ID = "f89cad0092452c7fcfe52c2b720e1043";

/**
 * admax（ninja by Shinobi）の画面上部バナー広告。
 *
 * 非同期タグ(st/t.js + admaxadsキュー)では広告枠は表示されても中身が
 * つかなかったため、同期タグ(s/{admax_id})をそのまま埋め込む方式に変更。
 *
 * このアプリはNext.jsのApp RouterでSPA的にページ遷移するが、
 * このコンポーネントはルートレイアウトに置かれ画面遷移では再マウントされないため、
 * 広告スクリプトの初期化は初回の1回だけでよい。
 * 広告を独立したiframe内に描画し、親ページの状態と切り離す
 * （他のページ内スクリプトとの干渉を避ける）。
 */
export default function AdBanner() {
  const pathname = usePathname();
  const hidden = pathname === "/login" || pathname === "/signup";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hidden || !containerRef.current) return;
    const container = containerRef.current;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
    iframe.title = "広告";
    iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>
</head>
<body>
<div class="admax-ads" data-admax-id="${ADMAX_ID}" style="display:block;width:100%;"></div>
<script src="https://adm.shinobi.jp/s/${ADMAX_ID}"></script>
</body>
</html>`;
    container.appendChild(iframe);

    return () => {
      container.innerHTML = "";
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-[50px] flex-shrink-0 bg-gray-50 border-b border-gray-100 overflow-hidden"
    />
  );
}
