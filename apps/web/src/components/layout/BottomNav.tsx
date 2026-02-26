'use client';

import { Home, Upload, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/upload', icon: Upload, label: '업로드' },
  { href: '/history', icon: History, label: '기록' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200">
      <div className="max-w-2xl mx-auto flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-sm gap-[2px] min-h-[60px] transition-colors ${
                isActive ? 'text-primary' : 'text-neutral-400'
              }`}
            >
              <Icon size={22} />
              <span className="text-small">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
