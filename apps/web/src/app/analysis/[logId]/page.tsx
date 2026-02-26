'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Badge from '@/components/ui/Badge';
import ActionGuideBox from '@/components/ui/ActionGuideBox';
import Disclaimer from '@/components/ui/Disclaimer';
import Card from '@/components/ui/Card';
import MedTypeTag from '@/components/ui/MedTypeTag';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAnalysisLog } from '@/hooks/useAnalysis';
import type { RiskLevel, InteractionDetail } from '@/types';

function InteractionCard({ detail, index }: { detail: InteractionDetail; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-md text-left"
      >
        <div className="flex-1 space-y-sm">
          <div className="flex items-center gap-sm flex-wrap">
            <Badge riskLevel={detail.severity} />
            <span className="text-caption text-neutral-600">
              {detail.type === 'contraindication' ? '병용금기' : detail.type === 'duplicate' ? '성분 중복' : '용량 초과'}
            </span>
          </div>
          <p className="text-body text-neutral-900">
            {detail.med_a.name}
            {detail.med_b ? ` + ${detail.med_b.name}` : ''}
          </p>
        </div>
        <div className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center text-neutral-400">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span className="sr-only">{expanded ? '접기' : '자세히 보기'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-md pt-md border-t border-neutral-200 space-y-md">
          <div>
            <p className="text-caption text-neutral-600 mb-xs">관련 약물</p>
            <div className="space-y-xs">
              <p className="text-body">{detail.med_a.name} ({detail.med_a.ingredient})</p>
              {detail.med_b && (
                <p className="text-body">{detail.med_b.name} ({detail.med_b.ingredient})</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-caption text-neutral-600 mb-xs">상세 사유</p>
            <p className="text-body text-neutral-900">{detail.reason_plain}</p>
          </div>
          <div>
            <p className="text-caption text-neutral-600 mb-xs">출처</p>
            <p className="text-caption text-neutral-400">{detail.source}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AnalysisResultPage() {
  const params = useParams();
  const logId = params.logId as string;
  const { data: log, isLoading, isError } = useAnalysisLog(logId);

  if (isLoading) {
    return (
      <PageContainer title="분석 결과" showBack>
        <LoadingSpinner message="분석 결과를 불러오는 중..." />
      </PageContainer>
    );
  }

  if (isError || !log) {
    return (
      <PageContainer title="분석 결과" showBack>
        <div className="text-center py-3xl">
          <p className="text-body text-neutral-600">분석 결과를 찾을 수 없습니다.</p>
        </div>
      </PageContainer>
    );
  }

  const interactions = log.interactions as { found_count: number; details: InteractionDetail[] };

  return (
    <PageContainer title="분석 결과" showBack>
      <div className="space-y-xl">
        {/* Traffic Light Badge */}
        <div className="text-center py-lg">
          <Badge riskLevel={log.risk_level as RiskLevel} size="lg" />
        </div>

        {/* Summary */}
        <Card>
          <h3 className="text-h3 text-neutral-900 mb-sm">분석 요약</h3>
          <p className="text-body text-neutral-900">{log.summary}</p>
        </Card>

        {/* Action Guide */}
        {log.action_guide && (
          <ActionGuideBox guide={log.action_guide} />
        )}

        {/* Interaction Details */}
        {interactions.details && interactions.details.length > 0 && (
          <section>
            <h3 className="text-h3 text-neutral-900 mb-lg">
              상세 분석 ({interactions.found_count}건)
            </h3>
            <div className="space-y-md">
              {interactions.details.map((detail, i) => (
                <InteractionCard key={i} detail={detail} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </PageContainer>
  );
}
