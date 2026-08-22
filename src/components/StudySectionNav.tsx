"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/timetable",
    label: "時間割",
    description: "今週の授業",
    icon: "calendar",
  },
  {
    href: "/records",
    label: "出欠",
    description: "欠席を記録",
    icon: "check",
  },
  {
    href: "/exams",
    label: "試験",
    description: "試験日程",
    icon: "flag",
  },
  {
    href: "/simulator",
    label: "履修",
    description: "履修を組む",
    icon: "spark",
  },
] as const;

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

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m8 12.5 2.5 2.5L16 9.5" />
      </svg>
    );
  }
  if (name === "flag") {
    return (
      <svg {...common}>
        <path d="M5 21V4m0 1h11l-1.5 3L16 11H5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v18M3 12h18" />
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" opacity=".45" />
    </svg>
  );
}

export default function StudySectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="授業管理メニュー"
      className="-mx-4 border-y border-slate-200 bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
    >
      <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/timetable" && pathname.startsWith("/courses/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-[5rem] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                active
                  ? "bg-sky-600 font-semibold text-white shadow-sm"
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
