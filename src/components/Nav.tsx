"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "今日" },
  { href: "/timetable", label: "時間割" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 flex border-b border-black/10 bg-white/90 backdrop-blur dark:bg-black/80 dark:border-white/10">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              active
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
