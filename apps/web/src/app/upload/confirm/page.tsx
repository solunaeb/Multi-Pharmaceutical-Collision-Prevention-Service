'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, List } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MedTypeTag from '@/components/ui/MedTypeTag';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { useProfile } from '@/context/ProfileContext';
import { useRegisterMedications } from '@/hooks/useMedications';
import type { MedType } from '@/types';

interface ExtractedMed {
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: MedType;
  confidence: number;
  selected: boolean;
}

interface OcrResult {
  ocrSessionId: string;
  imageType: string;
  confidenceScore: number;
  extractedMeds: Omit<ExtractedMed, 'selected'>[];
}

const medTypeOptions = [
  { value: 'prescription', label: '처방약' },
  { value: 'otc', label: 'OTC' },
  { value: 'supplement', label: '건강기능식품' },
];

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.8) {
    return (
      <span className="inline-flex items-center gap-xs text-caption text-safe-text">
        <CheckCircle size={14} />
        높음
      </span>
    );
  }
  if (score >= 0.6) {
    return (
      <span className="inline-flex items-center gap-xs text-caption text-caution-text">
        <AlertTriangle size={14} />
        보통
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-xs text-caption text-danger-text">
      <AlertTriangle size={14} />
      낮음 — 확인 필요
    </span>
  );
}

export default function OcrConfirmPage() {
  const router = useRouter();
  const { selectedProfileId } = useProfile();
  const registerMeds = useRegisterMedications();

  const [meds, setMeds] = useState<ExtractedMed[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasRawKeywords, setHasRawKeywords] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ocrResult');
    const storedPreview = sessionStorage.getItem('ocrPreview');
    const rawKeywords = sessionStorage.getItem('rawKeywords');
    if (stored) {
      const result: OcrResult = JSON.parse(stored);
      setMeds(result.extractedMeds.map((m) => ({ ...m, selected: true })));
    }
    if (storedPreview) setPreview(storedPreview);
    if (rawKeywords) setHasRawKeywords(true);
    setLoaded(true);
  }, []);

  const toggleMed = (index: number) => {
    setMeds((prev) => prev.map((m, i) => (i === index ? { ...m, selected: !m.selected } : m)));
  };

  const updateMed = (index: number, field: string, value: string) => {
    setMeds((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const handleRegister = () => {
    if (!selectedProfileId) return;
    const selectedMeds = meds.filter((m) => m.selected);
    if (selectedMeds.length === 0) return;

    registerMeds.mutate(
      {
        profileId: selectedProfileId,
        meds: selectedMeds.map((m) => ({
          name: m.name,
          ingredient: m.ingredient,
          dose: m.dose,
          days: m.days,
          type: m.type,
          source: 'camera' as const,
        })),
      },
      {
        onSuccess: (data) => {
          sessionStorage.removeItem('ocrResult');
          sessionStorage.removeItem('ocrPreview');
          sessionStorage.removeItem('rawKeywords');
          router.push(`/analysis/${data.interactionResult.log_id}`);
        },
      },
    );
  };

  if (!loaded) return null;

  if (meds.length === 0) {
    return (
      <PageContainer title="인식 결과" showBack showNav={false}>
        <div className="text-center py-3xl">
          <p className="text-body text-neutral-600">인식된 약물이 없습니다.</p>
          <Button variant="secondary" onClick={() => router.push('/upload')} className="mt-lg">
            다시 촬영하기
          </Button>
        </div>
      </PageContainer>
    );
  }

  const selectedCount = meds.filter((m) => m.selected).length;

  return (
    <PageContainer title="인식 결과 확인" showBack showNav={false}>
      <div className="space-y-xl">
        {/* Image Preview */}
        {preview && (
          <div className="flex justify-center">
            <img
              src={preview}
              alt="업로드된 이미지"
              className="max-h-[150px] rounded-input object-contain"
            />
          </div>
        )}

        {/* Extracted Meds */}
        <div className="space-y-md">
          <h3 className="text-h3 text-neutral-900">
            인식된 약물 ({meds.length}건)
          </h3>
          {hasRawKeywords && (
            <button
              onClick={() => router.push('/upload/keywords')}
              className="w-full flex items-center justify-center gap-sm py-sm px-lg rounded-button border border-neutral-200 text-body text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <List size={16} />
              전체 텍스트에서 선택하기
            </button>
          )}
          {meds.map((med, i) => (
            <Card key={i}>
              <div className="space-y-md">
                {/* Header: checkbox + name + confidence */}
                <div className="flex items-start gap-md">
                  <input
                    type="checkbox"
                    checked={med.selected}
                    onChange={() => toggleMed(i)}
                    className="mt-1 w-5 h-5 accent-primary"
                    aria-label={`${med.name} 선택`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap mb-xs">
                      <MedTypeTag type={med.type} />
                      <ConfidenceBadge score={med.confidence} />
                    </div>
                    <Input
                      label="약품명"
                      value={med.name}
                      onChange={(e) => updateMed(i, 'name', e.target.value)}
                    />
                  </div>
                </div>

                {med.selected && (
                  <div className="pl-[32px] space-y-md">
                    <Input
                      label="주성분"
                      value={med.ingredient || ''}
                      onChange={(e) => updateMed(i, 'ingredient', e.target.value)}
                    />
                    <Input
                      label="용량/용법"
                      value={med.dose || ''}
                      onChange={(e) => updateMed(i, 'dose', e.target.value)}
                    />
                    <Select
                      label="약물 유형"
                      options={medTypeOptions}
                      value={med.type}
                      onChange={(e) => updateMed(i, 'type', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleRegister}
          loading={registerMeds.isPending}
          disabled={selectedCount === 0}
          className="w-full"
        >
          {selectedCount}개 약물 등록하기
        </Button>

        {registerMeds.isError && (
          <p className="text-body text-danger text-center">
            등록에 실패했습니다. 다시 시도해주세요.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
