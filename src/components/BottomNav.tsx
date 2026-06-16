'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, CalendarDays, Receipt, Sliders } from 'lucide-react';

const navItems = [
  { href: '/', label: '账本', icon: Receipt },
  { href: '/betting', label: '投注台', icon: Target },
  { href: '/schedule', label: '赛程', icon: CalendarDays },
  { href: '/settings', label: '设置', icon: Sliders },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-apple-bg/85 backdrop-blur-xl border-t border-apple-border/20 z-40 flex items-center justify-around px-4 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center space-y-0.5 w-14 h-12 transition-all duration-200 ${
              isActive ? 'text-apple-accent' : 'text-apple-secondary-fg hover:text-apple-fg'
            }`}
          >
            <Icon size={20} />
            <span className="text-[9px] font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
