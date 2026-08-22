"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// UI/UX見直し（ユーザー要望）：従来の「時間割」「記録」は同じ授業・出席関連の
// 機能で重複していたため統合し（記録は時間割ページのメニューから開く導線に変更）、
// 空いたタブに「くらし」（お金・奨学金・教科書、旧マイページのカード群）を新設した。
// これにより下部タブが「学習（時間割・カルテ）」「生活（くらし）」
// 「アカウント（マイページ）」に機能ごと明確に分かれる構成にした。
const items = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/timetable", label: "時間割", icon: "calendar" },
  { href: "/karte", label: "カルテ", icon: "book" },
  { href: "/life", label: "くらし", icon: "wallet" },
  { href: "/mypage", label: "マイページ", icon: "user" },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "#111827" : "#9ca3af";
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.5-3.5 5-5 7.5-5s6 1.5 7.5 5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 9h18" />
          <circle cx="16" cy="13.5" r="1.2" fill={color} stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

// アカウント登録前の利用者だけが訪れることを想定した公開ページ。
// これらのページでBottomNavを出すと、押しても直後にログイン画面へ弾かれる
// リンクだらけのナビゲーションを見せてしまうため非表示にする。
// "/sponsors" は既存ユーザーもマイページから訪れる混在ページで、戻る手段が
// BottomNav以外に無いため、意図的にこの一覧に含めない（対象外のまま）。
const PRE_ACCOUNT_PATHS = ["/login", "/signup", "/browse", "/install"];

export default function BottomNav() {
  const pathname = usePathname();
  // /admin は運営（学生開発者本人）専用の管理画面で、学生向けナビゲーションの
  // 対象外（そもそも学生アカウントでのログインを前提にしていない画面のため）。
  if (PRE_ACCOUNT_PATHS.includes(pathname) || pathname.startsWith("/admin")) return null;
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-gray-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2"
          >
            <Icon name={item.icon} active={active} />
            <span className={`text-[10px] ${active ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
