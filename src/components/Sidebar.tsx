'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, CalendarDays, Receipt, Sliders } from 'lucide-react';

const navItems = [
  { href: '/', label: '数据看板', icon: LayoutDashboard },
  { href: '/ledger-entry', label: '快速记账', icon: BookOpen },
  { href: '/schedule', label: '赛程总览', icon: CalendarDays },
  { href: '/ledger', label: '下注账本', icon: Receipt },
  { href: '/settings', label: '系统设置', icon: Sliders },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-apple-bg/80 backdrop-blur-xl border-r border-apple-border/20 z-30 p-6">
      <div className="flex items-center space-x-3 mb-8 px-2">
        <span className="text-xl font-bold tracking-tight text-apple-fg">投注账本</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-apple-md text-[14px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-apple-accent text-white shadow-sm'
                  : 'text-apple-secondary-fg hover:text-apple-fg hover:bg-apple-secondary-bg/60'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-apple-border/10">
        <span className="text-[12px] font-medium text-apple-secondary-fg">2026 美加墨世界杯</span>
      </div>
    </aside>
  );
}
