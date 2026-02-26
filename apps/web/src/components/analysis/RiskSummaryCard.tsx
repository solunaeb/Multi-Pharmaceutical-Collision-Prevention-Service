'use client';

import { CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { RiskLevel } from '@/types';

interface RiskSummaryCardProps {
  riskLevel: RiskLevel | null;
  summary?: string;
  logId?: string;
}

const config = {
  safe: {
    icon: CheckCircle,
    bg: 'bg-safe-bg',
    border: 'border-safe/30',
    text: 'text-safe-text',
    title: '안전',
    defaultSummary: '현재 약물 간 충돌이 발견되지 않았습니다.',
  },
  caution: {
    icon: AlertTriangle,
    bg: 'bg-caution-bg',
    border: 'border-caution/30',
    text: 'text-caution-text',
    title: '주의 필요',
    defaultSummary: '확인이 필요한 약물 조합이 있습니다.',
  },
  contraindicated: {
    icon: XCircle,
    bg: 'bg-danger-bg',
    border: 'border-danger/30',
    text: 'text-danger-text',
    title: '확인 필요',
    defaultSummary: '의사와 상담이 필요한 약물 조합이 발견되었습니다.',
  },
};

export default function RiskSummaryCard({
  riskLevel,
  summary,
  logId,
}: RiskSummaryCardProps) {
  const router = useRouter();

  if (!riskLevel) {
    return (
      <div className="bg-neutral-50 rounded-card p-lg border border-neutral-200">
        <p className="text-body text-neutral-600">분석 결과가 없습니다. 약물을 등록하면 자동으로 분석됩니다.</p>
      </div>
    );
  }

  const c = config[riskLevel];
  const Icon = c.icon;

  return (
    <button
      onClick={() => logId && router.push(`/analysis/${logId}`)}
      className={`w-full ${c.bg} rounded-card p-lg border ${c.border} flex items-center gap-md text-left transition-opacity hover:opacity-90`}
      disabled={!logId}
    >
      <Icon size={28} className={c.text} />
      <div className="flex-1 min-w-0">
        <p className={`text-body-bold ${c.text}`}>{c.title}</p>
        <p className={`text-caption ${c.text} opacity-80 line-clamp-2`}>
          {summary || c.defaultSummary}
        </p>
      </div>
      {logId && <ChevronRight size={20} className={`${c.text} opacity-60 shrink-0`} />}
    </button>
  );
}
