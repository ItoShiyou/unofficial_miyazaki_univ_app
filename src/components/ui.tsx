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
