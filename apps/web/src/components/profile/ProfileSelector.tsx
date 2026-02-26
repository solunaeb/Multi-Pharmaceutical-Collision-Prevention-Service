'use client';

import { Plus } from 'lucide-react';
import type { Profile } from '@/types';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function ProfileSelector({
  profiles,
  selectedId,
  onSelect,
  onAdd,
}: ProfileSelectorProps) {
  return (
    <div className="flex gap-sm overflow-x-auto pb-sm -mx-1 px-1">
      {profiles.map((profile) => (
        <button
          key={profile.id}
          onClick={() => onSelect(profile.id)}
          className={`
            shrink-0 px-lg py-sm rounded-tag text-body font-medium transition-colors
            min-h-[48px]
            ${
              selectedId === profile.id
                ? 'bg-primary text-white'
                : 'bg-white text-neutral-600 border border-neutral-200'
            }
          `}
        >
          {profile.name}
        </button>
      ))}
      <button
        onClick={onAdd}
        className="shrink-0 px-lg py-sm rounded-tag bg-white text-neutral-600 border border-neutral-200 border-dashed
          flex items-center gap-xs min-h-[48px] hover:bg-neutral-50 transition-colors"
      >
        <Plus size={16} />
        <span className="text-body">추가</span>
      </button>
    </div>
  );
}
