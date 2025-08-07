"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    // ✅ query string을 추가하여 리렌더링 유도
    { href: `/persona-confirm`, label: "채팅" },
    { href: "/create-persona", label: "페르소나 생성" },
    { href: "/stats", label: "통계" },
    { href: "/admin/personas", label: "페르소나 기록" },
  ];

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white px-6 pt-16 pb-6 fixed top-0 left-0 z-40 shadow-xl flex flex-col">
      <nav className="flex flex-col gap-4 text-sm font-medium">
        {navItems.map(({ href, label }) => {
          // pathname에서 쿼리 파라미터 제거 후 비교
          const baseHref = href.split("?")[0];
          const isActive = pathname === baseHref || pathname.startsWith(baseHref + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-2 text-center transition-all 
                ${isActive ? "bg-blue-600 font-bold shadow" : "hover:bg-blue-700"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
