'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

interface RawKeyword {
  text: string;
  matchedMedIndex: number | null;
}

interface ExtractedMed {
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: 'prescription' | 'otc' | 'supplement';
  confidence: number;
}

interface OcrResult {
  ocrSessionId: string;
  imageType: string;
  confidenceScore: number;
  extractedMeds: ExtractedMed[];
  rawKeywords: RawKeyword[];
}

function inferMedType(imageType: string): 'prescription' | 'otc' | 'supplement' {
  switch (imageType) {
    case 'prescription':
    case 'med_bag':
      return 'prescription';
    case 'otc_box':
      return 'otc';
    case 'supplement_label':
      return 'supplement';
    default:
      return 'prescription';
  }
}

export default function KeywordSelectionPage() {
  const router = useRouter();
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ocrResult');
    const storedPreview = sessionStorage.getItem('ocrPreview');

    if (stored) {
      const result: OcrResult = JSON.parse(stored);

      // rawKeywords가 없으면 기존 흐름으로 fallback
      if (!result.rawKeywords || result.rawKeywords.length === 0) {
        router.replace('/upload/confirm');
        return;
      }

      setOcrResult(result);

      // 자동 인식된 키워드 pre-select
      const preSelected = new Set<number>();
      result.rawKeywords.forEach((kw, i) => {
        if (kw.matchedMedIndex !== null) preSelected.add(i);
      });
      setSelected(preSelected);
    }

    if (storedPreview) setPreview(storedPreview);
    setLoaded(true);
  }, [router]);

  // 자동 인식 키워드를 상단에 정렬
  const sortedIndices = useMemo(() => {
    if (!ocrResult) return [];
    const indices = ocrResult.rawKeywords.map((_, i) => i);
    indices.sort((a, b) => {
      const aMatched = ocrResult.rawKeywords[a].matchedMedIndex !== null ? 0 : 1;
      const bMatched = ocrResult.rawKeywords[b].matchedMedIndex !== null ? 0 : 1;
      return aMatched - bMatched;
    });
    return indices;
  }, [ocrResult]);

  const toggleKeyword = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (!ocrResult) return;
    if (selected.size === ocrResult.rawKeywords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ocrResult.rawKeywords.map((_, i) => i)));
    }
  };

  const handleNext = () => {
    if (!ocrResult) return;

    const usedMedIndices = new Set<number>();
    const meds: ExtractedMed[] = [];

    for (const kwIndex of selected) {
      const kw = ocrResult.rawKeywords[kwIndex];
      if (kw.matchedMedIndex !== null && !usedMedIndices.has(kw.matchedMedIndex)) {
        usedMedIndices.add(kw.matchedMedIndex);
        meds.push(ocrResult.extractedMeds[kw.matchedMedIndex]);
      } else if (kw.matchedMedIndex === null) {
        meds.push({
          name: kw.text,
          ingredient: null,
          dose: null,
          days: null,
          type: inferMedType(ocrResult.imageType),
          confidence: 0.3,
        });
      }
    }

    const updatedResult = { ...ocrResult, extractedMeds: meds };
    sessionStorage.setItem('ocrResult', JSON.stringify(updatedResult));
    router.push('/upload/confirm');
  };

  if (!loaded) return null;

  if (!ocrResult || ocrResult.rawKeywords.length === 0) {
    return (
      <PageContainer title="키워드 선택" showBack showNav={false}>
        <EmptyState
          title="인식된 텍스트 없음"
          description="이미지에서 텍스트를 인식하지 못했습니다. 다른 사진으로 다시 시도해주세요."
          actionLabel="다시 촬영하기"
          onAction={() => router.push('/upload')}
        />
      </PageContainer>
    );
  }

  const allSelected = selected.size === ocrResult.rawKeywords.length;

  return (
    <PageContainer title="키워드 선택" showBack showNav={false}>
      <div className="space-y-xl">
        {/* 이미지 미리보기 */}
        {preview && (
          <div className="flex justify-center">
            <img
              src={preview}
              alt="업로드된 이미지"
              className="max-h-[120px] rounded-input object-contain"
            />
          </div>
        )}

        {/* 안내 */}
        <div className="bg-primary-light/30 rounded-card p-lg">
          <p className="text-body text-neutral-900">
            이미지에서 인식된 텍스트입니다. <strong>약물 이름</strong>에 해당하는 키워드를 선택해주세요.
          </p>
        </div>

        {/* 헤더 + 전체 선택 */}
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-neutral-900">
            인식된 키워드 ({ocrResult.rawKeywords.length}개)
          </h3>
          <button
            onClick={toggleAll}
            className="text-caption text-primary hover:underline min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        {/* 키워드 목록 */}
        <div className="space-y-sm">
          {sortedIndices.map(i => {
            const kw = ocrResult.rawKeywords[i];
            const isSelected = selected.has(i);
            const isAutoMatched = kw.matchedMedIndex !== null;

            return (
              <button
                key={i}
                onClick={() => toggleKeyword(i)}
                className={`
                  w-full flex items-center gap-md p-md rounded-card border-2 transition-colors text-left
                  min-h-[48px]
                  ${isSelected
                    ? 'border-primary bg-primary-light/20'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'}
                  ${isAutoMatched ? 'border-l-4 border-l-primary' : ''}
                `}
              >
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'bg-primary border-primary' : 'border-neutral-300'}
                `}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
                <span className="text-body text-neutral-900 flex-1">{kw.text}</span>
                {isAutoMatched && (
                  <span className="text-caption text-primary bg-primary-light/40 px-sm py-xs rounded-full flex-shrink-0">
                    자동 인식
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        <Button
          onClick={handleNext}
          disabled={selected.size === 0}
          className="w-full"
        >
          {selected.size}개 선택 — 다음
          <ChevronRight size={18} />
        </Button>
      </div>
    </PageContainer>
  );
}
