'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function Header({ title = '약이름', showBack = false }: HeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-md">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-xs text-neutral-600 -ml-1 min-w-[48px] min-h-[48px] justify-center"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={20} />
            <span className="text-caption">뒤로</span>
          </button>
        )}
        <h1 className="text-h3 text-neutral-900 flex-1">{title}</h1>
      </div>
    </header>
  );
}
