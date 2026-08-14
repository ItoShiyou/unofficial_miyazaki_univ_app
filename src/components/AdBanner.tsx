"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * admax（ninja by Shinobi）の広告枠。
 * ログイン・新規登録ページは広告なしのシンプルな画面にするため除外する。
 */
export default function AdBanner() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <div className="flex justify-center items-center bg-gray-50 border-t border-gray-100 overflow-hidden min-h-[1px]">
      {/* admax */}
      <Script src="https://adm.shinobi.jp/s/f89cad0092452c7fcfe52c2b720e1043" strategy="afterInteractive" />
      {/* admax */}
    </div>
  );
}
