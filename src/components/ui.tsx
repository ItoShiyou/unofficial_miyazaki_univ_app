"use client";

import Link from "next/link";

export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <h1 className="text-xl font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function ProgressBar({
  value,
  max,
  colorClass,
}: {
  value: number;
  max: number;
  colorClass?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const color =
    colorClass ??
    (ratio >= 1 ? "bg-red-500" : ratio >= 0.6 ? "bg-amber-500" : "bg-emerald-500");
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export function StarRating({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value === null) {
    return <span className="text-xs text-gray-400">評価なし</span>;
  }
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`5段階中${rounded}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i < rounded ? "#f59e0b" : "#e5e7eb"}
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" />
        </svg>
      ))}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

const TONE_CHIP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
  cyan: "bg-cyan-50 text-cyan-600",
  gray: "bg-gray-100 text-gray-500",
};

export type Tone = keyof typeof TONE_CHIP;

// カードの見出し用ピクトグラム。色つきの角丸チップにアイコンを乗せることで、
// 文字だけが並ぶ単調な一覧に視覚的な目印と遊びを加える。
export function IconChip({
  tone = "blue",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${TONE_CHIP[tone]}`}
    >
      {children}
    </span>
  );
}

// カード一覧に添える共通ピクトグラム。文字だけの一覧に視覚的な目印と
// 遊びを加えるための最小限のアイコンセット（BottomNavと同じ線画スタイル）。
export type IconName =
  | "user"
  | "tag"
  | "users"
  | "megaphone"
  | "checklist"
  | "chart"
  | "calendar"
  | "cap"
  | "target"
  | "file"
  | "sync"
  | "bell"
  | "history"
  | "trash"
  | "coin"
  | "briefcase"
  | "shield"
  | "book"
  | "flag";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.5-3.5 5-5 7.5-5s6 1.5 7.5 5" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12 3h6a2 2 0 0 1 2 2v6l-9 9-8-8z" />
          <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M2.5 20c1.2-3 4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
          <path d="M15.5 5.5c1.4.3 2.5 1.6 2.5 3s-1.1 2.7-2.5 3" />
          <path d="M16 15.8c2 .4 3.6 1.8 4.5 4.2" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="M3 10v4a1 1 0 0 0 1 1h2l8 4V5l-8 4H4a1 1 0 0 0-1 1Z" />
          <path d="M18 9a4 4 0 0 1 0 6" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M12 20V4M20 20v-7" />
          <path d="M2 20h20" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "cap":
      return (
        <svg {...common}>
          <path d="M2 9l10-4 10 4-10 4-10-4Z" />
          <path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.5" fill="currentColor" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      );
    case "sync":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
          <path d="M17 3v4h-4M7 21v-4h4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M12 8v5l3 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 15.5c0 1.1 1.1 2 2.5 2s2.5-.7 2.5-1.8c0-2.5-5-1.2-5-3.6 0-1.1 1.1-1.8 2.5-1.8s2.5.9 2.5 2" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 21V4m0 1h11l-1.5 3L16 11H5" />
        </svg>
      );
    default:
      return null;
  }
}

const TONE_BUTTON: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 active:bg-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 active:bg-emerald-100",
  amber: "bg-amber-50 text-amber-700 active:bg-amber-100",
  rose: "bg-rose-50 text-rose-700 active:bg-rose-100",
  violet: "bg-violet-50 text-violet-700 active:bg-violet-100",
  cyan: "bg-cyan-50 text-cyan-700 active:bg-cyan-100",
  gray: "bg-gray-100 text-gray-600 active:bg-gray-200",
};

// 「開く →」等の小さな青文字リンクは視認性・タップ領域の両方で不十分だったため、
// 色付きの背景を持つピル型ボタンに統一する（タップしやすい余白を確保）。
export function NavLinkButton({
  href,
  tone = "blue",
  children,
}: {
  href: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full pl-3 pr-2.5 py-1.5 text-xs font-medium shrink-0 ${TONE_BUTTON[tone]}`}
    >
      {children}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
