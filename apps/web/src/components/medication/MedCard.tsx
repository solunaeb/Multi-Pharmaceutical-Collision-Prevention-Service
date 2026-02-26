'use client';

import { Trash2 } from 'lucide-react';
import MedTypeTag from '@/components/ui/MedTypeTag';
import type { Medication } from '@/types';

interface MedCardProps {
  med: Medication;
  onDeactivate?: (id: string) => void;
}

export default function MedCard({ med, onDeactivate }: MedCardProps) {
  const dateStr = new Date(med.registeredAt).toLocaleDateString('ko-KR');

  return (
    <div className="bg-white rounded-card shadow-card p-lg flex items-center gap-md">
      <div className="flex-1 min-w-0 space-y-xs">
        <div className="flex items-center gap-sm flex-wrap">
          <MedTypeTag type={med.type} />
          <span className="text-body-bold text-neutral-900 truncate">{med.name}</span>
        </div>
        {med.ingredient && (
          <p className="text-caption text-neutral-600 truncate">{med.ingredient}</p>
        )}
        <p className="text-caption text-neutral-400">{dateStr}</p>
      </div>
      {onDeactivate && (
        <button
          onClick={() => onDeactivate(med.id)}
          className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label={`${med.name} 복용 중단`}
        >
          <Trash2 size={18} />
          <span className="sr-only">중단</span>
        </button>
      )}
    </div>
  );
}
