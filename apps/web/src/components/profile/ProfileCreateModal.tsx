'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ProfileCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; birthYear?: number | null; notes?: string | null }) => void;
  loading?: boolean;
}

export default function ProfileCreateModal({
  open,
  onClose,
  onSubmit,
  loading,
}: ProfileCreateModalProps) {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      birthYear: birthYear ? parseInt(birthYear) : null,
      notes: notes.trim() || null,
    });
    setName('');
    setBirthYear('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-card sm:rounded-card w-full max-w-lg p-xl space-y-xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between">
          <h2 className="text-h2">프로필 추가</h2>
          <button
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center text-neutral-400"
            aria-label="닫기"
          >
            <X size={20} />
            <span className="sr-only">닫기</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-lg">
          <Input
            label="이름"
            placeholder="예: 아버지, 어머니"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="출생연도"
            placeholder="예: 1957"
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
          />
          <Input
            label="메모"
            placeholder="예: 고혈압, 당뇨 처방 중"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-sm pt-sm">
            <Button variant="secondary" onClick={onClose} type="button" className="flex-1">
              취소
            </Button>
            <Button type="submit" loading={loading} disabled={!name.trim()} className="flex-1">
              추가하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
