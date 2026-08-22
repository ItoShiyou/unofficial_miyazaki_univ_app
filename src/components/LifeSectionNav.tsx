"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/life", label: "くらし", description: "生活機能の一覧", icon: "home" },
  { href: "/expenses", label: "収支", description: "お金を記録", icon: "coin" },
  { href: "/scholarships", label: "支援", description: "奨学金・学費支援", icon: "cap" },
  { href: "/textbooks", label: "教科書", description: "譲渡・売買", icon: "book" },
] as const;

// StudySectionNavと同じ「文字だけで色が無い」という指摘（ユーザー要望）を受け、
// StudySectionNavと同じ線画ピクトグラムをタブごとに追加した。
function NavIcon({ name, active }: { name: (typeof items)[number]["icon"]; active: boolean }) {
  const color = active ? "currentColor" : "#64748b";
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    );
  }
  if (name === "coin") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 15.5c0 1.1 1.1 2 2.5 2s2.5-.7 2.5-1.8c0-2.5-5-1.2-5-3.6 0-1.1 1.1-1.8 2.5-1.8s2.5.9 2.5 2" />
      </svg>
    );
  }
  if (name === "cap") {
    return (
      <svg {...common}>
        <path d="M2 9l10-4 10 4-10 4-10-4Z" />
        <path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}

export default function LifeSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="くらしメニュー" className="-mx-4 border-y border-slate-200 bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-[5rem] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                active
                  ? "bg-violet-600 font-semibold text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <NavIcon name={item.icon} active={active} />
              <span>{item.label}</span>
              <span className="sr-only">：{item.description}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
