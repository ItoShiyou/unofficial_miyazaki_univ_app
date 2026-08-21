"use client";

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
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i < rounded ? "#f59e0b" : "#e5e7eb"}
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
