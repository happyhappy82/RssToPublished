"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Rss,
  Sparkles,
  ListOrdered,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/sources", label: "해외 소스 관리", icon: Users },
  { href: "/scraped", label: "수집 결과 확인", icon: Rss },
  { href: "/process", label: "콘텐츠 AI 랩", icon: Sparkles },
  { href: "/queue", label: "업로드 대기열", icon: ListOrdered },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-8">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center space-x-2">
          <Sparkles size={24} className="text-blue-400" />
          <span>AI 마케팅 허브</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="bg-slate-800 p-4 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white">
            관리
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">마케팅 관리자</p>
            <p className="text-[10px] text-slate-500">Free 요금제 사용 중</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
