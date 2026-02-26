'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useRegisterMedications } from '@/hooks/useMedications';
import type { MedType } from '@/types';

const medTypeOptions = [
  { value: 'prescription', label: '처방약' },
  { value: 'otc', label: 'OTC (일반의약품)' },
  { value: 'supplement', label: '건강기능식품' },
];

export default function AddMedicationPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;
  const registerMeds = useRegisterMedications();

  const [name, setName] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [dose, setDose] = useState('');
  const [days, setDays] = useState('');
  const [type, setType] = useState<MedType>('prescription');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    registerMeds.mutate(
      {
        profileId,
        meds: [
          {
            name: name.trim(),
            ingredient: ingredient.trim() || null,
            dose: dose.trim() || null,
            days: days ? parseInt(days) : null,
            type,
            source: 'manual' as const,
          },
        ],
      },
      {
        onSuccess: (data) => {
          router.push(`/analysis/${data.interactionResult.log_id}`);
        },
      },
    );
  };

  return (
    <PageContainer title="약물 등록" showBack showNav={false}>
      <form onSubmit={handleSubmit} className="space-y-xl">
        <Input
          label="약품명"
          placeholder="예: 암로디핀베실산염정 5mg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="주성분 (영문명)"
          placeholder="예: amlodipine besylate"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
        />

        <Input
          label="용량/용법"
          placeholder="예: 1일 1회 5mg"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
        />

        <Input
          label="투약일수"
          type="number"
          placeholder="예: 30"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />

        <Select
          label="약물 유형"
          options={medTypeOptions}
          value={type}
          onChange={(e) => setType(e.target.value as MedType)}
        />

        <div className="pt-sm">
          <Button
            type="submit"
            loading={registerMeds.isPending}
            disabled={!name.trim()}
            className="w-full"
          >
            등록하고 충돌 분석하기
          </Button>
        </div>

        {registerMeds.isError && (
          <p className="text-body text-danger text-center">
            등록에 실패했습니다. 다시 시도해주세요.
          </p>
        )}
      </form>
    </PageContainer>
  );
}
