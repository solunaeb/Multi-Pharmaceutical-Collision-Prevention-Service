'use client';

import { useRouter } from 'next/navigation';
import { History } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useProfile } from '@/context/ProfileContext';
import { useAnalysisHistory } from '@/hooks/useAnalysis';
import type { RiskLevel } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const { selectedProfileId } = useProfile();
  const { data: logs, isLoading } = useAnalysisHistory(selectedProfileId);

  return (
    <PageContainer title="분석 기록">
      {isLoading ? (
        <LoadingSpinner message="기록을 불러오는 중..." />
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          icon={<History size={48} />}
          title="분석 기록이 없습니다"
          description="약물을 등록하면 자동으로 충돌 분석이 실행됩니다."
        />
      ) : (
        <div className="space-y-md">
          {logs.map((log) => {
            const dateStr = new Date(log.analyzedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={log.id}
                onClick={() => router.push(`/analysis/${log.id}`)}
              >
                <div className="flex items-start justify-between gap-md">
                  <div className="flex-1 min-w-0 space-y-sm">
                    <Badge riskLevel={log.riskLevel as RiskLevel} />
                    <p className="text-body text-neutral-900 line-clamp-2">
                      {log.summary || '분석 결과를 확인하세요.'}
                    </p>
                    <p className="text-caption text-neutral-400">{dateStr}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
